import {
  pgTable,
  serial,
  text,
  char,
  smallint,
  numeric,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  base_currency: char('base_currency', { length: 3 }).notNull().default('INR'),
  display_currency: char('display_currency', { length: 3 }),
  buffer_amounts: jsonb('buffer_amounts').notNull().default({ INR: 2000, USD: 100 }),
  projection_settings: jsonb('projection_settings').notNull().default({
    horizonDays: 30,
    burnWindowDays: 14,
    includeCreditAvail: false,
    alertHeadroomDays: 7,
    alertBurnJumpPct: 25,
  }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Refresh Tokens
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull().unique(),
  family_id: uuid('family_id').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
  replaced_by: integer('replaced_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  familyIdx: index('refresh_tokens_family').on(table.family_id),
}));

// 3. Accounts
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // 'checking', 'savings', 'cash', 'credit_card', 'upi', 'other'
  currency: char('currency', { length: 3 }).notNull(),
  opening_balance: numeric('opening_balance', { precision: 14, scale: 2 }).notNull().default('0.00'),
  credit_limit: numeric('credit_limit', { precision: 14, scale: 2 }),
  statement_day: smallint('statement_day'),
  archived_at: timestamp('archived_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('accounts_user').on(table.user_id),
}));

// 4. Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#888888'),
  is_fixed: boolean('is_fixed').notNull().default(false),
  parent_id: integer('parent_id'),
}, (table) => ({
  userCategoryUnique: uniqueIndex('user_category_unique').on(table.user_id, table.name),
}));

// 5. Imports
export const imports = pgTable('imports', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  source_type: text('source_type').notNull(), // 'paste', 'csv', 'sms_export'
  raw_text: text('raw_text').notNull(),
  parsed_json: jsonb('parsed_json'),
  status: text('status').notNull().default('pending'), // 'pending', 'confirmed', 'discarded'
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 6. Recurrences
export const recurrences = pgTable('recurrences', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  account_id: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  label: text('label').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  direction: text('direction').notNull(), // 'debit', 'credit'
  cadence: text('cadence').notNull(), // 'weekly', 'biweekly', 'monthly', 'one_off'
  next_at: timestamp('next_at', { withTimezone: true }).notNull(),
  end_at: timestamp('end_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 7. Transactions
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  account_id: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  posted_at: timestamp('posted_at', { withTimezone: true }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  direction: text('direction').notNull(), // 'debit', 'credit'
  category_id: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  merchant: text('merchant'),
  description: text('description'),
  bank_reference: text('bank_reference'),
  source: text('source').notNull().default('manual'), // 'manual', 'sms', 'csv', 'recurring', 'split', 'transfer'
  import_id: integer('import_id').references(() => imports.id, { onDelete: 'set null' }),
  recurrence_id: integer('recurrence_id').references(() => recurrences.id, { onDelete: 'set null' }),
  idempotency_key: text('idempotency_key'),
  voided_at: timestamp('voided_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPostedIdx: index('txn_user_posted').on(table.user_id, table.posted_at),
  bankRefIdx: index('txn_bank_ref').on(table.account_id, table.bank_reference),
  userIdempotencyUnique: uniqueIndex('txn_user_idempotency').on(table.user_id, table.idempotency_key),
}));

// 8. Projected Rows
export const projectedRows = pgTable('projected_rows', {
  id: serial('id').primaryKey(),
  recurrence_id: integer('recurrence_id').notNull().references(() => recurrences.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  account_id: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  due_at: timestamp('due_at', { withTimezone: true }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  direction: text('direction').notNull(),
  realized_tx_id: integer('realized_tx_id').references(() => transactions.id, { onDelete: 'set null' }),
  voided_at: timestamp('voided_at', { withTimezone: true }),
}, (table) => ({
  userDueIdx: index('projected_user_due').on(table.user_id, table.due_at),
  recDueUnique: uniqueIndex('projected_rec_due').on(table.recurrence_id, table.due_at),
}));

// 9. Transaction Changes (Audit & Revert)
export const transactionChanges = pgTable('transaction_changes', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  change_type: text('change_type').notNull(), // created | updated | voided | recategorized | reverted
  old_values: jsonb('old_values'),
  new_values: jsonb('new_values').notNull(),
  source: text('source').notNull(), // manual | import | revert
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  txChangeIdx: index('txn_changes_tx').on(table.transaction_id, table.created_at),
}));

// 10. Income Sources
export const incomeSources = pgTable('income_sources', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  account_id: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  cadence: text('cadence').notNull(),
  next_at: timestamp('next_at', { withTimezone: true }).notNull(),
  active: boolean('active').notNull().default(true),
});

// 11. Merchant Rules
export const merchantRules = pgTable('merchant_rules', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  category_id: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  weight: integer('weight').notNull().default(1),
}, (table) => ({
  userPatternUnique: uniqueIndex('merchant_rules_user_pattern').on(table.user_id, table.pattern),
}));

// 12. Budgets
export const budgets = pgTable('budgets', {
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  period: text('period').notNull().default('monthly'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  rollover: boolean('rollover').notNull().default(false),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.category_id, table.period] }),
}));

// 13. Budget Alerts
export const budgetAlerts = pgTable('budget_alerts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category_id: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  period_start: date('period_start').notNull(),
  threshold_pct: integer('threshold_pct').notNull(), // 50, 75, 100
  fired_at: timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  budgetAlertUnique: uniqueIndex('budget_alert_unique').on(table.user_id, table.category_id, table.period_start, table.threshold_pct),
}));

// 14. Headroom Alerts
export const headroomAlerts = pgTable('headroom_alerts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  currency: char('currency', { length: 3 }).notNull(),
  kind: text('kind').notNull(), // 'headroom_low', 'burn_spike'
  value: numeric('value', { precision: 14, scale: 2 }).notNull(),
  fired_at: timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
});

// 15. Groups
export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  join_code: text('join_code').notNull().unique(),
  base_currency: char('base_currency', { length: 3 }).notNull(),
  owner_id: integer('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 16. Group Members
export const groupMembers = pgTable('group_members', {
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'owner', 'member'
  joined_at: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.group_id, table.user_id] }),
}));

// 17. Splits
export const splits = pgTable('splits', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  posted_by: integer('posted_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  paid_by: integer('paid_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  label: text('label').notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  posted_at: timestamp('posted_at', { withTimezone: true }).notNull(),
  notes: text('notes'),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 18. Split Shares
export const splitShares = pgTable('split_shares', {
  split_id: integer('split_id').notNull().references(() => splits.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  share: numeric('share', { precision: 14, scale: 2 }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.split_id, table.user_id] }),
}));

// 19. Settlements
export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  group_id: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  from_user: integer('from_user').notNull().references(() => users.id, { onDelete: 'restrict' }),
  to_user: integer('to_user').notNull().references(() => users.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  settled_at: timestamp('settled_at', { withTimezone: true }).notNull().defaultNow(),
  linked_tx: integer('linked_tx').references(() => transactions.id, { onDelete: 'set null' }),
});
