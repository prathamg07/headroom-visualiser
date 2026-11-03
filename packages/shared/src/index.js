import { z } from 'zod';

// ==========================================
// 1. AUTH & USER PROFILE
// ==========================================

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128, 'Password too long'),
  timezone: z.string().default('UTC'),
  base_currency: z.string().length(3).toUpperCase().default('INR'),
  display_currency: z.string().length(3).toUpperCase().optional(),
  buffer_amounts: z.record(z.string(), z.number().nonnegative()).default({ INR: 2000, USD: 100 }),
  projection_settings: z.object({
    horizonDays: z.number().int().min(7).max(90).default(30),
    burnWindowDays: z.number().int().min(7).max(30).default(14),
    includeCreditAvail: z.boolean().default(false),
    alertHeadroomDays: z.number().int().positive().default(7),
    alertBurnJumpPct: z.number().positive().default(25),
  }).default({
    horizonDays: 30,
    burnWindowDays: 14,
    includeCreditAvail: false,
    alertHeadroomDays: 7,
    alertBurnJumpPct: 25,
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  timezone: z.string().optional(),
  base_currency: z.string().length(3).toUpperCase().optional(),
  display_currency: z.string().length(3).toUpperCase().nullable().optional(),
  buffer_amounts: z.record(z.string(), z.number().nonnegative()).optional(),
  projection_settings: z.object({
    horizonDays: z.number().int().min(7).max(90),
    burnWindowDays: z.number().int().min(7).max(30),
    includeCreditAvail: z.boolean(),
    alertHeadroomDays: z.number().int().positive(),
    alertBurnJumpPct: z.number().positive(),
  }).partial().optional(),
});

// ==========================================
// 2. ACCOUNTS
// ==========================================

export const accountKindEnum = ['checking', 'savings', 'cash', 'credit_card', 'upi', 'other'];

export const accountBaseSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required'),
  kind: z.enum(accountKindEnum),
  currency: z.string().length(3).toUpperCase(),
  opening_balance: z.number().default(0),
  credit_limit: z.number().positive().optional().nullable(),
  statement_day: z.number().int().min(1).max(28).optional().nullable(),
});

export const createAccountSchema = accountBaseSchema.refine((data) => {
  if (data.kind === 'credit_card' && !data.credit_limit) {
    return true;
  }
  return true;
});

export const updateAccountSchema = accountBaseSchema.partial();

// ==========================================
// 3. CATEGORIES
// ==========================================

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color').default('#888888'),
  is_fixed: z.boolean().default(false),
  parent_id: z.number().int().positive().nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ==========================================
// 4. TRANSACTIONS
// ==========================================

export const directionEnum = ['debit', 'credit'];
export const transactionSourceEnum = ['manual', 'sms', 'csv', 'recurring', 'split', 'transfer'];

export const createTransactionSchema = z.object({
  account_id: z.number().int().positive('Account is required'),
  posted_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).toUpperCase(),
  direction: z.enum(directionEnum),
  category_id: z.number().int().positive().nullable().optional(),
  merchant: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  bank_reference: z.string().trim().nullable().optional(),
  source: z.enum(transactionSourceEnum).default('manual'),
  import_id: z.number().int().positive().nullable().optional(),
  recurrence_id: z.number().int().positive().nullable().optional(),
  idempotency_key: z.string().trim().nullable().optional(),
});

export const updateTransactionSchema = z.object({
  account_id: z.number().int().positive().optional(),
  posted_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  direction: z.enum(directionEnum).optional(),
  category_id: z.number().int().positive().nullable().optional(),
  merchant: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
});

// ==========================================
// 5. RECURRENCES & INCOME SOURCES
// ==========================================

export const cadenceEnum = ['weekly', 'biweekly', 'monthly', 'one_off'];

export const createRecurrenceSchema = z.object({
  account_id: z.number().int().positive(),
  category_id: z.number().int().positive().nullable().optional(),
  label: z.string().trim().min(1, 'Label is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).toUpperCase(),
  direction: z.enum(directionEnum),
  cadence: z.enum(cadenceEnum),
  next_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()),
  end_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()).nullable().optional(),
});

export const updateRecurrenceSchema = createRecurrenceSchema.partial();

export const createIncomeSchema = z.object({
  account_id: z.number().int().positive(),
  label: z.string().trim().min(1, 'Label is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).toUpperCase(),
  cadence: z.enum(cadenceEnum),
  next_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()),
});

// ==========================================
// 6. IMPORTS & PARSED TRANSACTIONS
// ==========================================

export const candidateActionEnum = ['create', 'update', 'skip', 'discard'];

export const extractedTransactionSchema = z.object({
  posted_at: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  direction: z.enum(directionEnum),
  account_id: z.number().int().positive().nullable().optional(),
  account_name: z.string().optional(),
  merchant: z.string().nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  category_name: z.string().optional(),
  description: z.string().nullable().optional(),
  bank_reference: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
  action: z.enum(candidateActionEnum).default('create'),
  existing_id: z.number().int().positive().nullable().optional(),
  diff: z.record(z.string(), z.any()).optional(),
});

export const confirmImportSchema = z.object({
  items: z.array(extractedTransactionSchema),
  idempotency_key: z.string().min(1),
});

// ==========================================
// 7. GROUPS & SPLITS
// ==========================================

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required'),
  base_currency: z.string().length(3).toUpperCase(),
});

export const joinGroupSchema = z.object({
  join_code: z.string().trim().min(1, 'Join code is required'),
});

export const createSplitSchema = z.object({
  group_id: z.number().int().positive(),
  paid_by: z.number().int().positive(),
  label: z.string().trim().min(1, 'Split label is required'),
  total: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  posted_at: z.string().datetime({ offset: true }).or(z.date()).transform((val) => new Date(val).toISOString()),
  shares: z.array(z.object({
    user_id: z.number().int().positive(),
    share: z.number().nonnegative(),
  })).min(1),
  notes: z.string().trim().nullable().optional(),
}).refine((data) => {
  const sum = data.shares.reduce((acc, s) => acc + s.share, 0);
  return Math.abs(sum - data.total) <= 0.05; // within 5 cents / paise tolerance
}, {
  message: 'Shares sum must equal split total',
});

export const createSettlementSchema = z.object({
  from_user: z.number().int().positive(),
  to_user: z.number().int().positive(),
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  linked_tx: z.number().int().positive().nullable().optional(),
});

// ==========================================
// 8. BUDGETS
// ==========================================

export const setBudgetSchema = z.object({
  category_id: z.number().int().positive(),
  period: z.literal('monthly').default('monthly'),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).toUpperCase(),
  rollover: z.boolean().default(false),
});
