export const INDIAN_BANK_TEMPLATES = [
  // 1. HDFC Bank Debit
  {
    bank: 'HDFC',
    country: 'IN',
    name: 'HDFC Debit / UPI',
    regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|spent)\s*(?:from|on)\s*(?:HDFC\s*Bank\s*(?:A\/C|Card|Account)\s*(?:ending\s*)?([Xx*]?\d{3,4}))?.*?to\s*([^.]+?)(?:\.|\s+on|\s+Ref|\s+UPI)\s*(?:.*?Ref(?:no|erence)?[:\s/]*([A-Za-z0-9]+))?/i,
    parse(match, text) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const accountLastFour = match[2] ? match[2].replace(/\D/g, '').slice(-4) : null;
      let merchant = match[3] ? match[3].trim() : 'Unknown Merchant';
      merchant = merchant.replace(/^(VPA\s*|UPI\s*)/i, '').trim();
      const refMatch = text.match(/(?:Ref|UPI\s*Ref|Txn\s*ID)[:\s/]*([A-Za-z0-9]+)/i);
      const bank_reference = match[4] || (refMatch ? refMatch[1] : null);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: accountLastFour,
        merchant,
        bank_reference,
        bank: 'HDFC',
        confidence: 1.0,
      };
    },
  },

  // 2. HDFC Bank Credit
  {
    bank: 'HDFC',
    country: 'IN',
    name: 'HDFC Credit',
    regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*credited\s*to\s*HDFC\s*Bank\s*(?:A\/C|Account)\s*([Xx*]?\d{3,4}).*?(?:by|from)\s*([^.]+?)(?:\.|\s+Ref)/i,
    parse(match, text) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const accountLastFour = match[2] ? match[2].replace(/\D/g, '').slice(-4) : null;
      const merchant = match[3] ? match[3].trim() : 'Transfer';
      const refMatch = text.match(/(?:Ref|UPI\s*Ref|Txn\s*ID)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'credit',
        account_last_four: accountLastFour,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'HDFC',
        confidence: 1.0,
      };
    },
  },

  // 3. SBI Debit
  {
    bank: 'SBI',
    country: 'IN',
    name: 'SBI Debit',
    regex: /(?:A\/C|Account)\s*([Xx*]?\d{3,4})\s*(?:has been\s*)?debited\s*(?:by|for)\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:to|transfer to)\s*([^.]+?)(?:\.|\s+Ref)/i,
    parse(match, text) {
      const accountLastFour = match[1] ? match[1].replace(/\D/g, '').slice(-4) : null;
      const amount = parseFloat(match[2].replace(/,/g, ''));
      const merchant = match[3] ? match[3].trim() : 'Unknown';
      const refMatch = text.match(/(?:Ref|Ref\s*No|UPI\s*Ref)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: accountLastFour,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'SBI',
        confidence: 1.0,
      };
    },
  },

  // 4. ICICI Debit
  {
    bank: 'ICICI',
    country: 'IN',
    name: 'ICICI Debit',
    regex: /(?:Acct|A\/C)\s*(?:XX)?(\d{3,4})\s*debited\s*with\s*(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?Info:\s*([^.]+?)(?:\.|\s+Ref)/i,
    parse(match, text) {
      const accountLastFour = match[1] ? match[1].slice(-4) : null;
      const amount = parseFloat(match[2].replace(/,/g, ''));
      const merchant = match[3] ? match[3].trim() : 'Unknown';
      const refMatch = text.match(/(?:Ref|Ref\s*no)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: accountLastFour,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'ICICI',
        confidence: 1.0,
      };
    },
  },

  // 5. PhonePe UPI
  {
    bank: 'PhonePe',
    country: 'IN',
    name: 'PhonePe Paid',
    regex: /Paid\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*to\s*(.+?)\s*successfully/i,
    parse(match, text) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const merchant = match[2].trim();
      const refMatch = text.match(/(?:Txn\s*ID|Ref)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: null,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'PhonePe',
        confidence: 1.0,
      };
    },
  },

  // 6. Google Pay UPI
  {
    bank: 'GooglePay',
    country: 'IN',
    name: 'Google Pay Paid',
    regex: /You\s*paid\s*(.+?)\s*(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*using\s*Google\s*Pay/i,
    parse(match, text) {
      const merchant = match[1].trim();
      const amount = parseFloat(match[2].replace(/,/g, ''));
      const refMatch = text.match(/(?:UPI\s*(?:transaction\s*ID|Ref)|Txn\s*ID)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: null,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'GooglePay',
        confidence: 1.0,
      };
    },
  },

  // 7. Paytm UPI
  {
    bank: 'Paytm',
    country: 'IN',
    name: 'Paytm Paid',
    regex: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*paid\s*successfully\s*to\s*(.+?)\s*on\s*Paytm/i,
    parse(match, text) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const merchant = match[2].trim();
      const refMatch = text.match(/(?:Txn\s*ID|Ref)[:\s/]*([A-Za-z0-9]+)/i);

      return {
        amount,
        currency: 'INR',
        direction: 'debit',
        account_last_four: null,
        merchant,
        bank_reference: refMatch ? refMatch[1] : null,
        bank: 'Paytm',
        confidence: 1.0,
      };
    },
  },
];
