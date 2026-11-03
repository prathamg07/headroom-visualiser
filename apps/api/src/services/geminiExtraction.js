import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Fallback LLM extraction for non-templated text and messy SMS/receipt lines
 */
export async function extractWithGemini(unmatchedLines, userTimezone = 'UTC') {
  if (!unmatchedLines || unmatchedLines.length === 0) return [];

  if (!genAI) {
    console.warn('Gemini API key not configured or set to placeholder. Skipping LLM fallback.');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are a financial transaction extraction assistant.
Extract all debit and credit transactions from the following text lines.
Current date: ${new Date().toISOString().split('T')[0]}, User Timezone: ${userTimezone}.

Input text:
"""
${unmatchedLines.join('\n---\n')}
"""

Return a JSON array of objects with the following schema:
[
  {
    "amount": number (positive),
    "currency": "INR" or "USD" or "EUR" (3 letter ISO code),
    "direction": "debit" or "credit",
    "account_last_four": string or null (e.g. "1234"),
    "merchant": string (cleaned company or person name, e.g. "Uber", "Amazon", "Landlord"),
    "bank_reference": string or null (transaction or UPI reference number),
    "confidence": number (between 0.0 and 1.0)
  }
]
If a line is not a transaction, omit it. Return only the JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        ...item,
        amount: Number(item.amount),
        confidence: Number(item.confidence) || 0.8,
        source: 'llm_fallback',
        posted_at: new Date().toISOString(),
      }));
    }

    return [];
  } catch (err) {
    console.error('Gemini extraction fallback error:', err.message);
    return [];
  }
}
