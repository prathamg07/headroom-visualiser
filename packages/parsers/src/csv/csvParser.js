import Papa from 'papaparse';
import { DateTime } from 'luxon';

/**
 * Parse CSV data with column mapping
 */
export function parseBankCsv(csvText, columnMapping = {}) {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const {
    dateCol = 'Date',
    amountCol = 'Amount',
    directionCol = null,
    merchantCol = 'Description',
    refCol = 'Reference',
  } = columnMapping;

  const items = [];

  for (const row of result.data) {
    const rawDate = row[dateCol];
    const rawAmount = row[amountCol];
    const rawMerchant = row[merchantCol];
    const rawRef = refCol ? row[refCol] : null;

    if (!rawAmount || !rawDate) continue;

    const parsedNum = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
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
      const dt = DateTime.fromISO(rawDate);
      if (dt.isValid) {
        posted_at = dt.toISO();
      } else {
        const customDt = DateTime.fromFormat(rawDate, 'dd/MM/yyyy');
        if (customDt.isValid) {
          posted_at = customDt.toISO();
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
