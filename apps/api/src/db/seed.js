import bcrypt from 'bcryptjs';
import { db, sql } from './index.js';
import { users, accounts, categories, recurrences, projectedRows, transactions } from './schema.js';
import { DateTime } from 'luxon';

export async function seedDatabase() {
  console.log('Seeding database with Riya test scenario (PRD Section 8.7)...');

  // 1. Ensure extensions and tables exist
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;

  // Check if test user exists
  const existingUsers = await db.select().from(users);
  if (existingUsers.some((u) => u.email === 'riya@student.edu')) {
    console.log('Test user riya@student.edu already exists. Skipping seed.');
    return;
  }

  const password_hash = await bcrypt.hash('Password123!', 10);

  const [riya] = await db
    .insert(users)
    .values({
      name: 'Riya',
      email: 'riya@student.edu',
      password_hash,
      timezone: 'Asia/Kolkata',
      base_currency: 'INR',
      buffer_amounts: { INR: 2000, USD: 100 },
      projection_settings: {
        horizonDays: 30,
        burnWindowDays: 14,
        includeCreditAvail: false,
        alertHeadroomDays: 7,
        alertBurnJumpPct: 25,
      },
    })
    .returning();

  console.log(`Created user: ${riya.name} (${riya.email})`);

  // Categories
  const [rentCat] = await db.insert(categories).values({
    user_id: riya.id,
    name: 'Rent & Housing',
    color: '#1E88E5',
    is_fixed: true,
  }).returning();

  const [utilCat] = await db.insert(categories).values({
    user_id: riya.id,
    name: 'Utilities & Phone',
    color: '#FDD835',
    is_fixed: true,
  }).returning();

  const [subCat] = await db.insert(categories).values({
    user_id: riya.id,
    name: 'Subscriptions',
    color: '#D64545',
    is_fixed: true,
  }).returning();

  const [cardCat] = await db.insert(categories).values({
    user_id: riya.id,
    name: 'Credit Card Bill',
    color: '#E53935',
    is_fixed: true,
  }).returning();

  const [foodCat] = await db.insert(categories).values({
    user_id: riya.id,
    name: 'Food & Discretionary',
    color: '#E53935',
    is_fixed: false,
  }).returning();

  // Accounts
  const [hdfcSavings] = await db.insert(accounts).values({
    user_id: riya.id,
    name: 'HDFC Savings',
    kind: 'checking',
    currency: 'INR',
    opening_balance: '18400.00',
  }).returning();

  const [cash] = await db.insert(accounts).values({
    user_id: riya.id,
    name: 'Cash',
    kind: 'cash',
    currency: 'INR',
    opening_balance: '600.00',
  }).returning();

  const [hdfcCard] = await db.insert(accounts).values({
    user_id: riya.id,
    name: 'HDFC Credit Card',
    kind: 'credit_card',
    currency: 'INR',
    opening_balance: '0.00',
    credit_limit: '50000.00',
    statement_day: 15,
  }).returning();

  console.log('Created accounts: HDFC Savings (₹18,400), Cash (₹600), HDFC Card');

  // Historical transactions for last 14 days (median ₹340 / day)
  const today = DateTime.now().setZone('Asia/Kolkata').startOf('day');
  for (let i = 1; i <= 14; i++) {
    const txDate = today.minus({ days: i }).toJSDate();
    // Spend between ₹300 and ₹380 so median is ₹340
    const amt = i % 2 === 0 ? 330 : 350;
    await db.insert(transactions).values({
      user_id: riya.id,
      account_id: hdfcSavings.id,
      posted_at: txDate,
      amount: String(amt),
      currency: 'INR',
      direction: 'debit',
      category_id: foodCat.id,
      merchant: i % 2 === 0 ? 'Swiggy' : 'Zomato',
      description: 'Daily Food & Coffee',
      source: 'manual',
    });
  }

  // Recurrences (next 30 days)
  const recurrencesData = [
    { label: 'Rent', amount: '8000.00', daysAhead: 1, account_id: hdfcSavings.id, category_id: rentCat.id, direction: 'debit', cadence: 'monthly' },
    { label: 'Phone Bill', amount: '399.00', daysAhead: 3, account_id: hdfcSavings.id, category_id: utilCat.id, direction: 'debit', cadence: 'monthly' },
    { label: 'Netflix', amount: '649.00', daysAhead: 11, account_id: hdfcCard.id, category_id: subCat.id, direction: 'debit', cadence: 'monthly' },
    { label: 'Credit Card Bill', amount: '4200.00', daysAhead: 21, account_id: hdfcSavings.id, category_id: cardCat.id, direction: 'debit', cadence: 'monthly' },
    { label: "Parents' Transfer", amount: '10000.00', daysAhead: 27, account_id: hdfcSavings.id, category_id: null, direction: 'credit', cadence: 'monthly' },
    { label: 'December Rent', amount: '8000.00', daysAhead: 27, account_id: hdfcSavings.id, category_id: rentCat.id, direction: 'debit', cadence: 'monthly' },
  ];

  for (const item of recurrencesData) {
    const nextDate = today.plus({ days: item.daysAhead }).toJSDate();
    const [rec] = await db.insert(recurrences).values({
      user_id: riya.id,
      account_id: item.account_id,
      category_id: item.category_id,
      label: item.label,
      amount: item.amount,
      currency: 'INR',
      direction: item.direction,
      cadence: item.cadence,
      next_at: nextDate,
    }).returning();

    // Projected row
    await db.insert(projectedRows).values({
      recurrence_id: rec.id,
      user_id: riya.id,
      account_id: item.account_id,
      due_at: nextDate,
      amount: item.amount,
      direction: item.direction,
    });
  }

  console.log('Seeded recurrences and projected rows successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
