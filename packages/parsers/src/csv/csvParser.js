import Papa from 'papaparse';
import { DateTime } from 'luxon';

function findColumn(headers, candidates) {
  const normalized = new Map(headers.map((header) => [header.toLowerCase().replace(/[^a-z0-9]/g, ''), header]));
  return candidates
    .map((candidate) => normalized.get(candidate.replace(/[^a-z0-9]/gi, '').toLowerCase()))
    .find(Boolean) || null;
}

export function detectCsvColumns(csvText) {
  const result = Papa.parse(csvText.trim(), { header: true, preview: 1 });
  const headers = result.meta.fields || [];
  return {
    headers,
    dateCol: findColumn(headers, ['date', 'txndate', 'transactiondate', 'valuedate', 'posteddate']),
    amountCol: findColumn(headers, ['amount', 'transactionamount', 'txnamt']),
    directionCol: findColumn(headers, ['direction', 'type', 'crdr', 'debitcredit']),
    merchantCol: findColumn(headers, ['description', 'merchant', 'narration', 'details', 'particulars']),
    refCol: findColumn(headers, ['reference', 'referencenumber', 'refno', 'transactionid', 'txnid']),
    debitCol: findColumn(headers, ['debit', 'debitamount', 'withdrawal', 'withdrawals']),
    creditCol: findColumn(headers, ['credit', 'creditamount', 'deposit', 'deposits']),
  };
}

/**
 * Parse CSV data with column mapping
 */
export function parseBankCsv(csvText, columnMapping = {}) {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  let {
    dateCol,
    amountCol,
    directionCol,
    merchantCol,
    refCol,
    debitCol,
    creditCol,
  } = columnMapping;
  const detected = detectCsvColumns(csvText);
  dateCol ||= detected.dateCol;
  amountCol ||= detected.amountCol;
  directionCol ||= detected.directionCol;
  merchantCol ||= detected.merchantCol;
  refCol ||= detected.refCol;
  debitCol ||= detected.debitCol;
  creditCol ||= detected.creditCol;

  const items = [];

  for (const row of result.data) {
    const rawDate = row[dateCol];
    const rawAmount = amountCol ? row[amountCol] : null;
    const rawDebit = debitCol ? row[debitCol] : null;
    const rawCredit = creditCol ? row[creditCol] : null;
    const rawMerchant = row[merchantCol];
    const rawRef = refCol ? row[refCol] : null;

    if ((!rawAmount && !rawDebit && !rawCredit) || !rawDate) continue;

    const debitNum = parseFloat(String(rawDebit || '').replace(/[^0-9.-]/g, ''));
    const creditNum = parseFloat(String(rawCredit || '').replace(/[^0-9.-]/g, ''));
    const parsedNum = rawDebit && !Number.isNaN(debitNum)
      ? -Math.abs(debitNum)
      : rawCredit && !Number.isNaN(creditNum)
      ? Math.abs(creditNum)
      : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
    if (isNaN(parsedNum) || parsedNum === 0) continue;

    let direction = 'debit';
    let amount = Math.abs(parsedNum);

    if (directionCol && row[directionCol]) {
      const dirVal = String(row[directionCol]).toLowerCase();
      direction = dirVal.includes('cr') || dirVal.includes('credit') ? 'credit' : 'debit';
    } else {
      // If signed number
      direction = parsedNum < 0 ? 'debit' : 'credit';
    }

    // Attempt date parsing
    let posted_at = new Date().toISOString();
    try {
      const dt = DateTime.fromISO(String(rawDate));
      if (dt.isValid) {
        posted_at = dt.toISO();
      } else {
        const customDt = DateTime.fromFormat(String(rawDate), 'dd/MM/yyyy');
        if (customDt.isValid) {
          posted_at = customDt.toISO();
        } else {
          const usDt = DateTime.fromFormat(String(rawDate), 'MM/dd/yyyy');
          if (usDt.isValid) posted_at = usDt.toISO();
        }
      }
    } catch {
      // fallback to now
    }

    items.push({
      posted_at,
      amount,
      currency: 'INR', // default, can be overridden by account
      direction,
      merchant: (rawMerchant || 'Bank Transaction').trim(),
      bank_reference: rawRef ? String(rawRef).trim() : null,
      confidence: 1.0,
      action: 'create',
    });
  }

  return items;
}
