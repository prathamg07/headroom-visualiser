import express from 'express';
import multer from 'multer';
import { db } from '../db/index.js';
import { imports, transactions, accounts, categories, transactionChanges } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import {
  extractFromPastedText,
  matchCandidateAgainstTransactions,
  parseBankCsv,
  detectCsvColumns,
  trigramSimilarity,
  redactPII,
} from '@headroom/parsers';
import { extractWithGemini } from '../services/geminiExtraction.js';
import { autoRealizeProjectedRow } from '../services/realization.js';

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit
const router = express.Router();
router.use(authenticate);

// Helper to auto-assign account and category
function autoAssign(candidate, userAccounts, userCategories) {
  let matchedAccount = null;
  if (candidate.account_last_four) {
    matchedAccount = userAccounts.find(
      (a) => a.name.includes(candidate.account_last_four) || (a.kind === 'credit_card' && candidate.direction === 'debit')
    );
  }
  if (!matchedAccount && userAccounts.length > 0) {
    matchedAccount = userAccounts.find((a) => a.currency === (candidate.currency || 'INR')) || userAccounts[0];
  }

  // Category match via trigram
  let bestCategory = null;
  let bestScore = 0;
  for (const cat of userCategories) {
    const score = trigramSimilarity(candidate.merchant || '', cat.name);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return {
    account_id: matchedAccount ? matchedAccount.id : null,
    account_name: matchedAccount ? matchedAccount.name : 'Unknown Account',
    category_id: bestCategory ? bestCategory.id : null,
    category_name: bestCategory ? bestCategory.name : 'Uncategorized',
  };
}

router.post('/paste', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, req.user.id), isNull(accounts.archived_at)));

    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, req.user.id));

    const existingTxs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.user_id, req.user.id), isNull(transactions.voided_at)));

    // 1. Run regex extraction & PII scrub
    const { redactedFullText, matched, unmatched } = extractFromPastedText(text);

    // 2. Fallback to Gemini LLM for unmatched lines
    let llmCandidates = [];
    if (unmatched.length > 0) {
      llmCandidates = await extractWithGemini(unmatched);
    }

    const allCandidates = [...matched, ...llmCandidates];

    // 3. Match against existing transactions (duplicates/corrections) and assign account/category
    const processedItems = allCandidates.map((cand) => {
      const matchResult = matchCandidateAgainstTransactions(cand, existingTxs);
      const assignment = autoAssign(cand, userAccounts, userCategories);

      return {
        ...cand,
        account_id: cand.account_id || assignment.account_id,
        account_name: assignment.account_name,
        category_id: cand.category_id || assignment.category_id,
        category_name: assignment.category_name,
        action: matchResult.action, // 'create' | 'skip' | 'update' | 'discard'
        duplicate_of_id: matchResult.existing_id || null,
        diff: matchResult.diff || null,
        reason: matchResult.reason,
      };
    });

    // Save pending import record
    const [savedImport] = await db
      .insert(imports)
      .values({
        user_id: req.user.id,
        source_type: 'paste',
        raw_text: redactedFullText,
        parsed_json: processedItems,
        status: 'pending',
      })
      .returning();

    return res.json({
      import_id: savedImport.id,
      redactedText: redactedFullText,
      items: processedItems,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file required' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.user_id, req.user.id), isNull(accounts.archived_at)));

    const userCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.user_id, req.user.id));

    const existingTxs = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.user_id, req.user.id), isNull(transactions.voided_at)));

    // Parse CSV
    let columnMapping = {};
    if (req.body?.column_mapping) {
      try {
        columnMapping = JSON.parse(req.body.column_mapping);
      } catch {
        return res.status(400).json({ error: 'Invalid CSV column mapping' });
      }
    }
    const detectedColumns = detectCsvColumns(csvContent);
    const parsedRows = parseBankCsv(csvContent, { ...detectedColumns, ...columnMapping });

    const processedItems = parsedRows.map((cand) => {
      const matchResult = matchCandidateAgainstTransactions(cand, existingTxs);
      const assignment = autoAssign(cand, userAccounts, userCategories);

      return {
        ...cand,
        account_id: assignment.account_id,
        account_name: assignment.account_name,
        category_id: assignment.category_id,
        category_name: assignment.category_name,
        action: matchResult.action,
        duplicate_of_id: matchResult.existing_id || null,
        diff: matchResult.diff || null,
        reason: matchResult.reason,
      };
    });

    const [savedImport] = await db
      .insert(imports)
      .values({
        user_id: req.user.id,
        source_type: 'csv',
        raw_text: redactPII(csvContent.slice(0, 5000)), // preview capped
        parsed_json: processedItems,
        status: 'pending',
      })
      .returning();

    return res.json({
      import_id: savedImport.id,
      items: processedItems,
      columns: detectedColumns,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [record] = await db
      .select()
      .from(imports)
      .where(and(eq(imports.id, id), eq(imports.user_id, req.user.id)));

    if (!record) {
      return res.status(404).json({ error: 'Import not found' });
    }

    return res.json(record);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Confirm import and insert transactions into ledger with idempotency
router.post('/:id/confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { items, idempotency_key } = req.body;

    const [importRecord] = await db
      .select()
      .from(imports)
      .where(and(eq(imports.id, id), eq(imports.user_id, req.user.id)));

    if (!importRecord) {
      return res.status(404).json({ error: 'Import not found' });
    }
    if (importRecord.status === 'confirmed') {
      return res.status(409).json({ error: 'Import has already been confirmed' });
    }

    const appliedTransactions = [];

    for (const item of items || []) {
      if (item.action === 'skip' || item.action === 'discard') {
        continue;
      }

      if (item.action === 'update' && item.duplicate_of_id) {
        // Update existing transaction
        const [updated] = await db
          .update(transactions)
          .set({
            amount: String(item.amount),
            merchant: item.merchant,
            category_id: item.category_id,
          })
          .where(and(eq(transactions.id, item.duplicate_of_id), eq(transactions.user_id, req.user.id)))
          .returning();

        if (updated) {
          appliedTransactions.push(updated);
        }
      } else if (item.action === 'create') {
        if (!item.account_id) {
          return res.status(400).json({ error: 'Every transaction must have an account selected' });
        }
        const [account] = await db
          .select({ id: accounts.id, currency: accounts.currency })
          .from(accounts)
          .where(and(eq(accounts.id, item.account_id), eq(accounts.user_id, req.user.id), isNull(accounts.archived_at)));
        if (!account) {
          return res.status(400).json({ error: 'Selected account is not available' });
        }
        if (item.category_id) {
          const [category] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.id, item.category_id), eq(categories.user_id, req.user.id)));
          if (!category) {
            return res.status(400).json({ error: 'Selected category is not available' });
          }
        }
        // Insert new transaction
        const [created] = await db
          .insert(transactions)
          .values({
            user_id: req.user.id,
            account_id: item.account_id,
            posted_at: new Date(item.posted_at || Date.now()),
            amount: String(item.amount),
            currency: item.currency || 'INR',
            direction: item.direction || 'debit',
            category_id: item.category_id || null,
            merchant: item.merchant,
            description: item.description || item.merchant,
            bank_reference: item.bank_reference,
            source: importRecord.source_type === 'csv' ? 'csv' : 'sms',
            import_id: id,
            idempotency_key: idempotency_key ? `${idempotency_key}_${appliedTransactions.length}` : null,
          })
          .returning();

        appliedTransactions.push(created);

        // Auto-realize matching projected recurring row
        await autoRealizeProjectedRow({
          userId: req.user.id,
          accountId: created.account_id,
          amount: created.amount,
          direction: created.direction,
          postedAt: created.posted_at,
          transactionId: created.id,
        });
      }
    }

    // Mark import confirmed
    await db
      .update(imports)
      .set({ status: 'confirmed' })
      .where(eq(imports.id, id));

    return res.json({
      message: `Successfully applied ${appliedTransactions.length} transactions.`,
      applied: appliedTransactions,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db
      .delete(imports)
      .where(and(eq(imports.id, id), eq(imports.user_id, req.user.id)));
    return res.json({ message: 'Import discarded' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
