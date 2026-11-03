export const US_BANK_TEMPLATES = [
  // 1. Chase Bank alert
  {
    bank: 'Chase',
    country: 'US',
    name: 'Chase Card Purchase',
    regex: /Chase\s*Alert:\s*You\s*made\s*a\s*(?:\$|USD\s*)([\d,]+\.?\d*)\s*transaction\s*with\s*(.+?)\s*on\s*card\s*ending\s*in\s*(\d{4})/i,
    parse(match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
        direction: 'debit',
        account_last_four: match[3],
        merchant: match[2].trim(),
        bank_reference: null,
        bank: 'Chase',
        confidence: 1.0,
      };
    },
  },

  // 2. Bank of America alert
  {
    bank: 'BofA',
    country: 'US',
    name: 'BofA Debit / Credit',
    regex: /Bank\s*of\s*America:\s*(?:A\s*)?(?:debit|credit)\s*card\s*charge\s*of\s*\$([\d,]+\.?\d*)\s*at\s*(.+?)\s*on\s*account\s*ending\s*in\s*(\d{4})/i,
    parse(match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
        direction: 'debit',
        account_last_four: match[3],
        merchant: match[2].trim(),
        bank_reference: null,
        bank: 'BofA',
        confidence: 1.0,
      };
    },
  },

  // 3. Wells Fargo alert
  {
    bank: 'WellsFargo',
    country: 'US',
    name: 'Wells Fargo Transaction',
    regex: /Wells\s*Fargo:\s*(?:A\s*)?purchase\s*of\s*\$([\d,]+\.?\d*)\s*was\s*made\s*at\s*(.+?)\s*with\s*card\s*(?:ending\s*in\s*)?(\d{4})/i,
    parse(match) {
      return {
        amount: parseFloat(match[1].replace(/,/g, '')),
        currency: 'USD',
        direction: 'debit',
        account_last_four: match[3],
        merchant: match[2].trim(),
        bank_reference: null,
        bank: 'WellsFargo',
        confidence: 1.0,
      };
    },
  },
];
