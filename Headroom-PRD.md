# Headroom: Product Requirements Document

> See how much month you have left at the end of your money.

| | |
|---|---|
| **Product** | Headroom |
| **Version** | 1.0 (initial draft) |
| **Date** | 4 November 2026 |
| **Type** | Full-stack web application (course assignment and portfolio project) |
| **Stack** | JavaScript (no TypeScript), React.js, Node.js, Express.js, PostgreSQL (see section 9.5) |

---

## 1. Overview

Students spend from several accounts (UPI wallet, cash, debit card, credit card), earn from several sources (part-time paycheck, stipend, money sent from parents, Venmo settle-ups from friends), and share recurring costs with roommates and trip groups. Each transaction is small, but the picture at the end of the month is often a surprise: rent, a credit-card bill, and a subscription renewal land in the same week and the balance goes lower than planned.

**Headroom** collects transactions from messy sources (pasted bank or UPI SMS, uploaded bank CSV, manual entries), categorizes them, forecasts the daily cash position for the next thirty days, shows a **cash-flow heatmap** of tight days ahead, warns about **collisions** when known costs stack on the same days, and tells the student how many days of **headroom** remain at the current burn rate.

### One-line pitch

Paste your bank SMS, see which weeks are going to be tight, and know how many days of spending you have left.

### What makes it different from a plain expense tracker

1. **Smart import:** transactions are extracted from SMS, UPI confirmations, receipts, and bank CSVs instead of typed by hand.
2. **Forward-looking, not just historical:** the app projects the next thirty days against known income and recurring costs. A pie chart of last month is not enough.
3. **Cash position, not just totals:** the heatmap shows which days will dip near zero, not just which categories spent the most.
4. **Multi-account aware:** cash, UPI, debit, and credit are all tracked separately and summed into one position, so a credit purchase today is not confused with cash leaving today.

### Key terms

| Term | Meaning |
|---|---|
| **Account** | A place money sits or a line of credit: checking, savings, cash, UPI wallet, credit card |
| **Transaction** | A single debit or credit, tied to one account |
| **Category** | What the money was for: food, rent, transport, and so on |
| **Recurring** | A transaction that repeats on a schedule (rent, Netflix, paycheck) |
| **Projection** | The forecasted daily closing balance for a chosen account or group of accounts |
| **Burn rate** | Average daily discretionary spending over a recent window |
| **Headroom** | Days of spending left before projected balance crosses the user's buffer line |
| **Collision** | A run of two or more adjacent dates on which the projected balance is below the buffer line |

---

## 2. Problem Statement

- Transactions arrive from several places (bank SMS, UPI confirmations, card statements, cash) and nobody wants to type them in by hand.
- The same transaction is often announced in several messages (the bank SMS, the UPI confirmation, the merchant receipt), which produces duplicates.
- Known recurring costs (rent, phone bill, subscriptions, EMIs) are easy to forget until they hit, and they often stack with discretionary spending in a bad week.
- Students carry a credit card plus a debit card plus cash; the "balance" shown by a bank app is not the real spendable position because posted credit charges have not yet cleared.
- Shared expenses with roommates and trip groups turn into a mess of "I'll Venmo you later" that never gets settled.
- Budget apps that exist (Mint shut down in 2024, YNAB is paid, Splitwise only handles splits) either stopped working, cost money, or solve only part of the problem. Nothing is open, student-focused, and understands Indian UPI SMS plus US bank CSVs in one place.

---

## 3. Goals and Non-Goals

### Goals
- G1. Reduce the effort of capturing a transaction to a paste, a CSV upload, or one tap.
- G2. Make upcoming cash-flow trouble visible before it happens, not after.
- G3. Give an actionable "headroom" number: days of safe spending left at the current burn rate.
- G4. Let a group of roommates or friends share expenses and settle up in the minimum number of transactions.
- G5. Meet the assignment requirement of at least 6 working features (this product defines 8).
- G6. Make categorization and recurrence detection improve over time by learning from the user's own history.
- G7. Keep every imported transaction reviewable before it hits the ledger, and every manual edit reversible from a history view.

### Non-Goals (v1)
- Direct bank connections (Plaid, Account Aggregator, Yodlee). Imports are user-initiated: paste, upload, or share. Direct bank access is future work.
- Investment tracking (stocks, mutual funds, crypto). This is a cash-flow and expense tool, not a wealth tracker.
- Tax reporting or categorization for tax purposes.
- Multi-currency balance consolidation beyond a single display conversion. Each account keeps its own currency; the projection is per currency.
- Native mobile apps (a responsive web app and PWA are in scope).
- Receipt OCR from phone cameras. Users paste the receipt text or upload a CSV. OCR is future work.
- Advertising, affiliate links, or any monetization.

---

## 4. Target Users

| Persona | Description | Main needs |
|---|---|---|
| **Student with a part-time job** (primary) | College student spending from a mix of cash, UPI, and card accounts, with irregular income | Capture transactions quickly, see upcoming tight days, know what to cut |
| **International student** | Student with INR accounts at home and USD accounts on campus | Track each account in its own currency without the app pretending the two are one balance |
| **Roommate / trip organizer** | Student who fronts shared costs (rent, groceries, Airbnb) and needs to settle up | Record a split once, have the group see it, and settle in fewer transactions |

---

## 5. Features and Requirements

### F1. Authentication, profile, accounts, and income

- Register and log in with email and password; JWT access tokens with refresh tokens.
- Profile: name, timezone, base currency, and optional display currency for the summary view only.
- **Accounts:** named places money sits or a line of credit (checking, savings, cash, UPI, credit card). Each account has a currency and an opening balance; a credit-card account has a credit limit and a statement day.
- **Income sources:** labeled inflows that repeat on a schedule (biweekly paycheck, monthly stipend, parents' transfer on the 1st). Each one has an amount, currency, cadence, and the account it lands in.
- **Buffer:** a per-user amount per currency that defines "below headroom." The projected balance crossing the buffer is what the heatmap colors red.
- **Projection settings:** forecast horizon in days (default 30, maximum 90), burn-rate window in days (default 14, range 7 to 30), and whether to include credit-card available credit in the projected position (default: no).
- Passwords are 12 to 128 characters. Hash with bcrypt or argon2. Access JWTs expire after 15 minutes; refresh tokens expire after 30 days, stored hashed, held in an httpOnly secure cookie, and rotated on every refresh. Reuse of a revoked refresh token revokes its token family.
- Login is rate limited to 5 failed attempts per account and source IP in 15 minutes; the lockout window is 15 minutes. Error responses do not reveal whether an email is registered.

**Acceptance criteria**
- A user can register, log in, refresh a session, and log out.
- Saving a valid IANA timezone and ISO 4217 currency returns those values on the next profile read; invalid values are rejected without changing the profile.
- Register rejects a malformed email, duplicate email, password under 12 or over 128 characters; the database stores only a password hash.
- Login with valid credentials issues a 15-minute access token and 30-day refresh token; refresh rotates the refresh token; logout revokes the active refresh token, and that token can no longer refresh a session. Reusing a revoked refresh token revokes the family.
- Accounts accept a name, kind, currency, and numeric opening balance; a credit-card account additionally accepts a positive credit limit and a day of month (1 to 28) for the statement date.
- Income sources accept a positive amount, ISO 4217 currency, a cadence from the supported set (`weekly`, `biweekly`, `monthly`, `one_off`), an upcoming date, and a target account; a cadence or currency outside the supported set is rejected.
- Buffer amounts accept a non-negative value per currency and are stored per currency, not globally.
- Forecast horizon is an integer from 7 to 90 inclusive; burn-rate window is an integer from 7 to 30 inclusive. Values outside those ranges are rejected with field-level validation errors.
- After 5 failed attempts for the same account and source IP in 15 minutes, another login attempt is rejected for 15 minutes with a rate-limit response; a successful login does not bypass an active lockout.

### F2. Smart import (SMS, UPI confirmations, bank CSV, pasted text)

- User pastes transaction text (one SMS or many at once), or uploads a bank statement CSV, or uploads a `.txt` file of exported SMS.
- The server extracts candidate transactions and returns them to a **review screen**. Nothing hits the ledger until the user confirms.
- Each extracted item has: `posted_at` instant, `amount`, `currency`, `direction` (debit or credit), `account` (matched or suggested), `merchant` (cleaned), `category` (suggested), `description` (original line, kept for audit), and a `confidence` from 0 to 1.
- The pipeline runs regex-based parsers first for templated bank and UPI SMS (see section 7.3), then falls back to the LLM for lines the regex set does not match.
- Each extracted item carries an **intent**: a new transaction, a **duplicate** of one already recorded, or a **correction** of one already recorded (same reference number, different amount). The user confirms or changes the match.
- The review screen shows each item with its proposed action (**Create**, **Skip (duplicate)**, **Update**, or **Discard**). Items with confidence below 0.60 are visually flagged.
- Confirmed items are inserted in one transaction. Each gets an idempotency key so the same confirmation request cannot double-insert.

**Acceptance criteria**
- Given the fixed SMS fixtures in section 7.3, the regex parsers return the expected amount, direction, account, and merchant for each supported bank template; lines that do not match any pattern are passed to the LLM.
- The LLM response is validated against a schema; malformed items are discarded from the structured result and shown for manual correction.
- If the LLM call fails or is rate limited, the fallback still returns whatever the regex parsers extracted and lets the user complete the rest by hand.
- Users can preview exactly what text is sent to the LLM, and can delete any import afterward.
- Pasting an SMS whose reference number matches an existing transaction defaults to **Skip (duplicate)**; a matching reference number with a different amount defaults to **Update** and shows a before/after diff.
- Pasting a CSV whose rows match transactions already imported from the same account by `(posted_at, amount, direction, reference)` defaults to Skip for those rows and Create for the rest.
- Confirming an import applies only rows marked Create or Update; rows marked Skip or Discard have no ledger effect. Repeating the same confirmation request creates no duplicates.
- The chat-export style `.txt` parser joins continuation lines to the preceding message, skips system lines, and parses both Android and iOS SMS exports.
- Phone numbers, card numbers past the last four digits, and OTP values are stripped from the stored raw text before the LLM sees it.

### F3. Manual transactions and recurring transactions

- Create, edit, and void transactions by hand. "Void" sets the transaction's `voided_at` and removes it from totals and projections; the row is kept for audit.
- Transaction fields: account, posted date and time, amount, currency, direction, category, merchant, description, and optional tags.
- **Recurring transactions:** a schedule that generates upcoming projected transactions (rent on the 1st, Netflix on the 14th, phone bill on the 25th). The schedule stores amount, currency, direction, account, category, cadence, next date, and an optional end date.
- A recurring entry generates **projected** rows for the forecast horizon. A projected row is not a real transaction; it is shown separately in the ledger and feeds the projection. When a real transaction imports or is entered manually and matches a projected row by `(account, cadence instance date, amount within tolerance)`, the projected row is marked `realized` and the real transaction takes its place in the projection.
- **Recurrence detection:** after enough history exists, the app scans for repeating merchant plus amount combinations (same amount, same merchant, same approximate day of month, three or more occurrences) and suggests promoting them to a recurring entry. The user accepts or ignores.
- Every change to a transaction (edit, void, re-categorize) is recorded in a change-history table the user can view and revert.

**Acceptance criteria**
- A manual transaction accepts a positive amount, a valid account owned by the user, a direction, and a posted date no more than 2 years in the past or 1 year in the future; other values are rejected with field-level errors.
- A recurring transaction with cadence `monthly` and day 1 generates one projected row for each month in the forecast horizon, dated on the 1st, with the configured amount and direction.
- Weekly and biweekly cadences anchor to the recurrence's `next_at` date and continue every 7 or 14 days through the horizon or the recurrence's end date, whichever is earlier.
- Editing a recurring entry updates only future projected rows and leaves already-realized rows unchanged.
- Marking a transaction voided removes it from category totals, account balances, burn-rate calculation, and the projection on the next read.
- Reverting a transaction edit from history restores the previous field values and triggers a projection refresh.
- The recurrence detector flags a candidate when the same merchant appears at least 3 times within the last 90 days with amounts within 5% of each other and posted dates within 3 days of the same day-of-month; fewer than 3 matches produces no suggestion.

### F4. Ledger and calendar view

- A ledger view lists transactions newest first, filterable by account, category, direction, amount range, merchant text, and date range.
- A calendar view shows a monthly grid; each date shows total debits and total credits for the user's active accounts.
- Clicking a date opens that day's transactions.
- Clicking a transaction opens its detail and history.

**Acceptance criteria**
- Each selected account, category, direction, merchant text, amount-range, and date filter includes exactly the matching transactions; clearing filters restores all non-voided transactions in the selected range.
- Voided transactions do not appear in the default ledger view and are shown only when the "Include voided" filter is on.
- Calendar date totals equal the sum of non-voided transactions whose `posted_at` falls on that local date in the user's timezone; projected (unrealized) rows are shown with a distinct marker and sum separately.
- Changing the display currency reformats displayed totals using the stored conversion rate for each transaction's date but does not change stored amounts.

### F5. Cash-flow heatmap and collision warnings

- The heatmap shows the next N days (default 30) as a calendar grid.
- Each date is colored by the **projected end-of-day balance** across the user's active cash and debit accounts (credit-card available credit is not included by default).
- **Collision** is a run of two or more adjacent dates whose projected balance is below the user's buffer line.

**Acceptance criteria**
- For a date in the forecast horizon, projected balance equals opening balance for that account plus the sum of non-voided posted transactions through that date plus the sum of projected (unrealized) recurring rows through that date.
- Projected balance at or above `buffer + safe_margin` (default: `buffer + 1 day of burn rate`) is green; between `buffer` and that threshold is yellow; below `buffer` is red; a day with no projected activity and balance equal to the prior day's balance is colored the same as the prior day.
- A collision is reported for each maximal run of at least 2 adjacent local dates whose projected balance is red; a one-day red run is not a collision. The warning links to every projected or posted debit on those dates.
- Changing the forecast horizon or the buffer value changes the colors on the next read; the stored transactions and recurrences are not modified.
- Marking a projected recurring row voided (for example, "I cancelled Netflix") removes it from the projection on the next read and the heatmap updates.

### F6. Headroom forecast and burn-rate alerts

- **Burn rate** is the median daily discretionary spending over the user's configured window (default 14 days). Rent, EMIs, and other transactions marked as fixed are excluded from the burn-rate calculation.
- **Headroom** is the integer number of future days the user can continue spending at the current burn rate before the projected balance crosses the buffer line, taking known credits and recurring debits into account.
- A dashboard tile shows "Headroom: N days" and the date on which the balance is projected to cross the buffer.
- An alert fires when headroom falls below a configured threshold (default: 7 days) or when the burn rate increases by more than a configured percentage week over week (default: 25%).

**Acceptance criteria**
- Burn rate equals the median of daily sums of non-voided, non-fixed debit amounts over the burn-rate window; days with no spending contribute zero. Fewer than 7 days of history returns no burn rate and no headroom.
- Headroom is computed by simulating forward from today: each future day subtracts the burn rate, adds any projected credits, and applies any projected recurring debits. The result is the number of days before projected balance first drops below the buffer, capped at the forecast horizon.
- Recomputing headroom with unchanged inputs returns the same value.
- Voiding a transaction, adjusting the buffer, or changing the burn-rate window triggers a headroom recomputation on the next read.
- When headroom crosses below the alert threshold, exactly one alert record is created per crossing. Returning above the threshold and crossing again creates a new alert.

### F7. Shared expenses and settle-up

- A user creates a **group** (roommates, trip) and receives a join code; others join with the code.
- Any member can post a **split**: total amount, who paid, and shares per member (default equal, with per-member overrides).
- The group view shows net balances: for each pair, who owes whom and how much.
- A **settle-up** action computes the minimum number of transfers that zero out all balances, using a greedy largest-creditor-to-largest-debtor algorithm (section 8.4).
- When a user records a real transfer that matches a suggested settlement, the group balances update and the split is marked settled.

**Acceptance criteria**
- Only members of a group can see its splits and balances.
- Posting a split with N members and total T, with shares summing to T, creates one split record and N share rows; shares that do not sum to T (within one minor unit of rounding) are rejected.
- A member can edit a split they posted; any member can comment on a split. Only the poster or the group owner can delete it.
- The net balance between two members equals the sum of what each has fronted for the other across all non-deleted splits in the group's base currency.
- Settle-up returns a list of transfers whose count is less than or equal to `N - 1` for N members with non-zero balances, and whose application sets all pairwise net balances to zero within one minor unit.
- A user can copy a settlement into their own ledger as a transfer transaction with one click.

### F8. Category budgets and burn alerts

- The user sets a monthly budget per category in a chosen currency.
- The dashboard shows for each budgeted category: amount spent this period, amount remaining, days remaining in the period, and the pace (spent divided by expected pace).
- An alert fires at 50%, 75%, and 100% of the period budget per category.
- A category can be marked **rollover**: unused budget at the end of the period adds to the next period.

**Acceptance criteria**
- A budget accepts a non-negative amount, a valid category owned by the user, a period (`monthly`), and a currency; invalid values are rejected.
- Spent-this-period equals the sum of non-voided debit transactions whose `posted_at` falls in the current period for that category.
- An alert record is created exactly once per threshold crossing per period per category; falling back below a threshold does not re-fire that threshold until the next period.
- For a rollover category, the next period's effective budget equals the configured budget plus any positive remainder from the prior period; a negative remainder (overspend) does not reduce the next period's budget.

### Optional extras (time permitting; not counted toward the 8 features)

- Export the ledger to CSV or `.ics` (as calendar entries for projected debits).
- Receipt text paste (short free-text parse for a merchant plus total).
- Monthly summary email on the 1st.
- PWA share target so an SMS can be shared directly into the importer.
- A per-account "statement reconciliation" view that compares the user's ledger balance to the bank's stated balance for a date.

---

## 6. User Flows

### 6.1 First-time setup
1. Register, then set timezone, base currency, and the buffer amount.
2. Add accounts (name, kind, currency, opening balance; credit-card accounts also set a limit and statement day).
3. Add income sources (paycheck every 2 weeks, parents' transfer on the 1st, etc.).
4. Add recurring debits (rent, phone, subscriptions).
5. Import or add first transactions. View the heatmap and headroom.

### 6.2 Importing bank or UPI SMS
1. Copy the SMS (one or many) and paste into the import box, or upload a `.txt` export.
2. The server runs the regex parsers; unmatched lines go to the LLM.
3. The user previews the parsed items on the review screen, resolves any flagged duplicates or corrections, and confirms.
4. Confirmed transactions are inserted; the heatmap, headroom, and category budgets update.

### 6.3 Settling up with roommates
1. The user opens the group and taps "Settle up."
2. The app shows the suggested minimum set of transfers.
3. The user sends the money through their bank or UPI app, then taps "Record" on each transfer; the group balances zero out.

### 6.4 When a tight week shows up
1. The heatmap turns red on three adjacent days next week.
2. The user opens the collision warning and sees the projected debits causing it (rent on the 1st, credit-card bill on the 3rd, concert on the 4th).
3. The user moves the concert to the following weekend by editing the planned transaction, or voids a subscription they no longer want. The heatmap updates on save.

---

## 7. Data Ingestion

### 7.1 Methods supported

| Method | Description | Priority |
|---|---|---|
| Paste | User pastes one or many SMS, UPI confirmations, or free-text transactions | Must have |
| CSV upload | Bank statement CSV, column mapping on first use per account | Must have |
| SMS export upload | `.txt` export from an Android SMS-backup app, filtered by date range | Must have |
| PWA share target | Share an SMS from the phone's SMS app into Headroom (Android, installed PWA) | Nice to have |
| Email forwarding | Forward a transaction email to a dedicated address; a webhook parses it | Stretch |

### 7.2 Extraction pipeline

1. **Pre-processing:** trim, strip phone numbers, card numbers past the last four digits, and OTPs; cap input length; split on newlines or SMS boundaries.
2. **Regex parsers:** a library of templated parsers (section 7.3) runs first. Each parser returns a structured item with its confidence set to 1.0 if the template matches exactly.
3. **LLM extraction (fallback):** lines not matched by any regex parser are sent in one batched request. The model is instructed to return JSON only, with the same schema as the regex output. The current date and the user's timezone are included.
4. **Validation:** the response is validated with Zod; malformed items are discarded.
5. **Matching:** each item is compared to existing transactions by `(account, reference number)` first, then by `(account, posted_at within 1 day, amount within 1 minor unit, direction)` to detect duplicates and corrections (section 7.4).
6. **Review:** the user confirms before anything is saved.

### 7.3 SMS and UPI parsing

- Indian banks (HDFC, ICICI, SBI, Axis, Kotak), credit-card issuers, and UPI apps (PhonePe, Google Pay, Paytm) send transaction SMS from fixed sender IDs with highly templated bodies. These templates change rarely and are the single highest-value source for Indian users.
- Each template is a labeled regex that extracts amount, direction, account last-four, merchant, and reference number. A versioned library of templates ships with the app; adding a new template needs only a new row and a test fixture.
- A fixture file holds at least 2 real anonymized SMS per supported template. CI runs them through the parsers and asserts the extracted fields.
- US bank SMS are less uniform; the regex set covers the common Chase, BofA, Wells Fargo, and Discover templates. Everything else falls back to the LLM.
- The regex set is extensible per user: a user can tag a parsed SMS as "misparsed" and the fix is logged for review.

### 7.4 Duplicate and correction detection

- **Exact reference match:** two transactions on the same account with the same bank reference number are the same transaction. The second is a Skip (duplicate) by default, unless the amount differs, in which case it is an Update (correction) and shows a before/after diff.
- **Fuzzy match:** two transactions on the same account posted within 1 calendar day of each other, with the same direction and amount within 1 minor unit, and merchant trigram similarity at or above 0.6, are flagged as a possible duplicate. The user confirms.
- **CSV versus SMS:** a CSV row and an SMS can match by date, amount, and direction even when the merchant string differs across the two sources. The merchant string from the CSV wins by default; the user can override.

### 7.5 Column mapping for CSVs

- The first upload for an account prompts a one-time mapping of the bank's CSV columns to the app's fields (`posted_at`, `amount`, `direction` or sign-of-amount, `description`, `reference`, `balance`). The mapping is saved per account.
- CSV files are parsed as streams; rows past a configured maximum (default 5000 per upload) require splitting the file.
- Dates in the CSV are parsed in the account's locale date order; an ambiguous date requires the user to pick the order on the first upload.

---

## 8. Algorithms

### 8.1 Projection (daily cash position)

**Inputs:** per account, the opening balance, all non-voided posted transactions through today, all non-voided projected recurring rows for the horizon, today's date in the user's timezone, and the forecast horizon.

**Procedure**
1. For each account separately, sort events (posted and projected) by `posted_at` ascending, then by stable ID.
2. Walk the sorted list; at each event, update the running balance.
3. For each date in the horizon, store the end-of-day balance per account.
4. The **combined position** on a date is the sum of end-of-day balances across accounts in the same currency, excluding credit-card accounts by default. Credit-card accounts are projected separately, so a card purchase does not inflate today's spendable cash.

### 8.2 Burn rate

```
discretionary(day) = sum of non-voided, non-fixed debits on day
burnRate = median over the last W days of discretionary(day)   // W default 14
```

- Debits tagged with a category marked `fixed: true` (rent, EMI, insurance, tuition) are excluded.
- Days with zero discretionary spending contribute zero.
- Fewer than 7 days of history returns no burn rate.
- The median is used so that a single large one-off day does not dominate.

### 8.3 Headroom

```
balance(0) = combined position at end of today
balance(d) = balance(d-1) - burnRate + projectedCredits(d) - projectedFixedDebits(d)
headroom   = smallest d > 0 with balance(d) < buffer, capped at the horizon
```

- `projectedCredits(d)` is the sum of recurring credits scheduled on day `d`.
- `projectedFixedDebits(d)` is the sum of recurring debits whose category is fixed, scheduled on day `d`. Non-fixed recurring debits are already represented in the historical burn rate pattern and are not added again.
- The headroom date is the first `d` for which `balance(d) < buffer`.

### 8.4 Settle-up (minimum transfers)

For a group with N members and net balances `b_1, ..., b_N` (positive = owed to; negative = owes), summing to zero within one minor unit:

1. Round each balance to the base currency's minor unit.
2. Keep two sorted lists: positives (creditors) and negatives (debtors) by absolute value, largest first.
3. While both lists are non-empty, pick the largest creditor `C` and the largest debtor `D`. Transfer `min(C, |D|)` from `D` to `C`. Reduce both by that amount. If either hits zero, remove it from its list.
4. The returned list is the suggested set of transfers.

This produces at most `N - 1` transfers. It is not globally minimal in every case, but is simple, predictable, and good enough for the group sizes expected (2 to 10).

### 8.5 Category auto-assignment

- The user's existing categorized transactions build a per-merchant map: for each merchant string, the most-used category, with the count.
- On import, each candidate is matched to the map by exact merchant string, then by trigram similarity at or above 0.7, then by a short list of system defaults (keywords: "uber", "zomato", "swiggy", "amzn", "venmo", etc.). The suggested category is shown on the review screen and the user can change it.
- Changing a category on an existing transaction updates the map immediately, with a weight of 1 per correction.

### 8.6 Recurrence detection

- Scan the last 90 days of non-voided debits grouped by cleaned merchant and amount bucket (amounts within 5% of each other are in the same bucket).
- A group with at least 3 occurrences, posted dates within 3 days of the same day of month, qualifies as a candidate.
- The suggested cadence is the median gap: around 7 days for weekly, 14 for biweekly, 28 to 31 for monthly.
- The candidate is suggested in a review list; the user accepts (which creates a recurring entry and starts generating projected rows) or ignores.

### 8.7 Worked example

**Student:** Riya, 4 November 2026. Base currency INR. Buffer ₹2,000.

**Accounts (opening balance today):**

| Account | Kind | Balance |
|---|---|---|
| HDFC Savings | checking | ₹18,400 |
| Cash | cash | ₹600 |
| HDFC Credit Card | credit_card | -₹4,200 (owed) |

**Recurring (next 30 days):**

| When | Label | Amount | Account |
|---|---|---|---|
| 5 Nov | Rent | -₹8,000 | HDFC Savings |
| 7 Nov | Phone bill | -₹399 | HDFC Savings |
| 15 Nov | Netflix | -₹649 | HDFC Credit Card |
| 25 Nov | Credit card bill | -₹4,200 | HDFC Savings |
| 1 Dec | Parents' transfer | +₹10,000 | HDFC Savings |
| 1 Dec | Rent | -₹8,000 | HDFC Savings |

**Burn rate (last 14 days):** median ₹340 per day of discretionary spending.

**Projection (combined cash position, excluding credit card):**

| Date | Event | End of day |
|---|---|---|
| 4 Nov | Start | ₹19,000 |
| 5 Nov | Rent (-8,000), burn (-340) | ₹10,660 |
| 6 Nov | Burn | ₹10,320 |
| 7 Nov | Phone (-399), burn | ₹9,581 |
| ... | burn each day | ... |
| 24 Nov | Burn | ₹3,117 |
| 25 Nov | Credit card bill (-4,200), burn | **-₹1,423** |

Projected balance crosses the ₹2,000 buffer between 23 and 24 November. **Headroom: 20 days.** The heatmap shows green through 22 November, yellow on 23, and red from 24 through 30 November. 24 to 30 November is a collision run of 7 adjacent red days; the warning links to the credit-card bill, the recurring debits in that window, and the burn rate.

**What-if:** Riya marks "Netflix cancelled" (voids the 15 Nov projected row). The projection recomputes: the credit-card bill on 25 Nov drops from ₹4,200 to ₹3,551 (next month). The 25 Nov balance moves from -₹1,423 to -₹774. Headroom becomes 21 days. The collision run shrinks but does not disappear; the real fix is to not pay the ₹4,200 card bill out of a ₹9k runway on the 25th. The app surfaces this: "Move ₹2,000 of card payment to after 1 Dec credit? Headroom goes to 30+ days."

### 8.8 Known limitations

- **Burn rate is a median, not a forecast.** It assumes next month looks like last two weeks. A sudden habit change (new gym membership, a trip) is only reflected after it hits the window.
- **Projected credits assume income actually arrives on the scheduled day.** A late paycheck is not modeled.
- **The projection excludes credit-card available credit by default.** This is deliberate (prevents the cash position from looking rosier than it is), but a user who treats their card as part of liquidity can turn it on.
- **Multi-currency is not consolidated.** Each account is projected in its own currency. The dashboard shows one tile per currency.
- **Settle-up is greedy, not provably minimal.** For groups of 2 to 10 this is fine. Optimization is future work.
- **Recurrence detection sees frequency and amount, not meaning.** A rent payment on the 1st and a rent payment moved to the 2nd one month look like near-matches; the user still has to confirm.

---

## 9. System Design

### 9.1 Architecture

```
React (dashboard, ledger, calendar, heatmap, review screen, group views)
        |  REST + JSON
Express API ── auth, accounts, transactions, imports, recurrences, groups, budgets
        |
        ├── Extraction service (regex parsers + LLM fallback + CSV reader)
        ├── Projection service (balance walk, burn rate, headroom)
        ├── Matching service (duplicates, corrections, recurrence detection)
        ├── Job runner (pg-boss) → alerts, recurrence rollouts, email summaries
        |
PostgreSQL (JSONB used for raw and parsed import data)
```

The projection service is a **pure function** (opening balances, posted transactions, projected rows, settings, today) → (daily balances, burn rate, headroom, heatmap colors), which makes it easy to unit test against the worked example in section 8.7.

### 9.2 Why PostgreSQL

- The domain is relational (users, accounts, transactions, recurrences, groups, members, splits), so foreign keys and cascades fit naturally.
- The projection and heatmap are date-range aggregations over transaction rows, which are simple `GROUP BY` queries.
- Unique indexes catch duplicates (same account plus bank reference).
- Transactions keep multi-step updates consistent (replacing a recurrence's future projected rows, applying an import batch, recording a settlement).
- `pg_trgm` powers merchant similarity for duplicate detection and category auto-assignment.
- JSONB stores raw import payloads without a second database.

### 9.3 Data model

```sql
CREATE TABLE users (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  timezone          TEXT NOT NULL DEFAULT 'UTC',
  base_currency     CHAR(3) NOT NULL,
  display_currency  CHAR(3),
  buffer_amounts    JSONB NOT NULL DEFAULT '{}',    -- {"INR": 2000, "USD": 100}
  projection_settings JSONB NOT NULL DEFAULT '{"horizonDays":30,"burnWindowDays":14,"includeCreditAvail":false,"alertHeadroomDays":7,"alertBurnJumpPct":25}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  family_id   UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by INT REFERENCES refresh_tokens(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE accounts (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('checking','savings','cash','credit_card','upi','other')),
  currency        CHAR(3) NOT NULL,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_limit    NUMERIC(14,2),                   -- credit_card only
  statement_day   SMALLINT CHECK (statement_day BETWEEN 1 AND 28),
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accounts_user ON accounts (user_id) WHERE archived_at IS NULL;

CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#888',
  is_fixed   BOOLEAN NOT NULL DEFAULT FALSE,
  parent_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE transactions (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  posted_at       TIMESTAMPTZ NOT NULL,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency        CHAR(3) NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
  merchant        TEXT,
  description     TEXT,
  bank_reference  TEXT,
  source          TEXT NOT NULL CHECK (source IN ('manual','sms','csv','recurring','split','transfer')),
  import_id       INT REFERENCES imports(id) ON DELETE SET NULL,
  recurrence_id   INT REFERENCES recurrences(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  voided_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE UNIQUE INDEX txn_bank_ref ON transactions (account_id, bank_reference) WHERE bank_reference IS NOT NULL AND voided_at IS NULL;
CREATE INDEX txn_user_posted ON transactions (user_id, posted_at DESC);
CREATE INDEX txn_merchant_trgm ON transactions USING gin (lower(merchant) gin_trgm_ops);

CREATE TABLE transaction_changes (
  id             SERIAL PRIMARY KEY,
  transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type    TEXT NOT NULL,   -- created | updated | voided | recategorized | reverted
  old_values     JSONB,
  new_values     JSONB NOT NULL,
  source         TEXT NOT NULL,   -- manual | import | revert
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX txn_changes_tx ON transaction_changes (transaction_id, created_at DESC);

CREATE TABLE recurrences (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  label       TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency    CHAR(3) NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  cadence     TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','one_off')),
  next_at     TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projected_rows (
  id              SERIAL PRIMARY KEY,
  recurrence_id   INT NOT NULL REFERENCES recurrences(id) ON DELETE CASCADE,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  due_at          TIMESTAMPTZ NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('debit','credit')),
  realized_tx_id  INT REFERENCES transactions(id) ON DELETE SET NULL,
  voided_at       TIMESTAMPTZ,
  UNIQUE (recurrence_id, due_at)
);
CREATE INDEX projected_user_due ON projected_rows (user_id, due_at) WHERE voided_at IS NULL AND realized_tx_id IS NULL;

CREATE TABLE income_sources (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id  INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency    CHAR(3) NOT NULL,
  cadence     TEXT NOT NULL CHECK (cadence IN ('weekly','biweekly','monthly','one_off')),
  next_at     TIMESTAMPTZ NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE merchant_rules (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern     TEXT NOT NULL,       -- lowercased substring
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  weight      INT NOT NULL DEFAULT 1,
  UNIQUE (user_id, pattern)
);

CREATE TABLE sms_templates (
  id         SERIAL PRIMARY KEY,
  bank       TEXT NOT NULL,
  country    CHAR(2) NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('debit','credit','either')),
  regex      TEXT NOT NULL,
  version    INT NOT NULL DEFAULT 1,
  UNIQUE (bank, country, version)
);

CREATE TABLE imports (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('paste','csv','sms_export')),
  raw_text    TEXT NOT NULL,
  parsed_json JSONB,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','discarded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budgets (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  period      TEXT NOT NULL CHECK (period IN ('monthly')),
  amount      NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  currency    CHAR(3) NOT NULL,
  rollover    BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, category_id, period)
);

CREATE TABLE budget_alerts (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  threshold_pct INT NOT NULL CHECK (threshold_pct IN (50,75,100)),
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, period_start, threshold_pct)
);

CREATE TABLE headroom_alerts (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency    CHAR(3) NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('headroom_low','burn_spike')),
  value       NUMERIC(14,2) NOT NULL,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  join_code  TEXT UNIQUE NOT NULL,
  base_currency CHAR(3) NOT NULL,
  owner_id   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id   INT REFERENCES groups(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE splits (
  id          SERIAL PRIMARY KEY,
  group_id    INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  posted_by   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_by     INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  label       TEXT NOT NULL,
  total       NUMERIC(14,2) NOT NULL CHECK (total > 0),
  currency    CHAR(3) NOT NULL,
  posted_at   TIMESTAMPTZ NOT NULL,
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE split_shares (
  split_id INT REFERENCES splits(id) ON DELETE CASCADE,
  user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  share    NUMERIC(14,2) NOT NULL CHECK (share >= 0),
  PRIMARY KEY (split_id, user_id)
);

CREATE TABLE settlements (
  id         SERIAL PRIMARY KEY,
  group_id   INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_user  INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  to_user    INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency   CHAR(3) NOT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_tx  INT REFERENCES transactions(id) ON DELETE SET NULL
);
```

**Projection query (daily end-of-day balance across non-credit accounts, in one currency):**

```sql
WITH events AS (
  SELECT t.posted_at::date AS day,
         SUM(CASE WHEN t.direction = 'credit' THEN t.amount ELSE -t.amount END) AS delta
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  WHERE t.user_id = $1
    AND a.currency = $2
    AND a.kind <> 'credit_card'
    AND t.voided_at IS NULL
  GROUP BY t.posted_at::date
  UNION ALL
  SELECT p.due_at::date,
         SUM(CASE WHEN p.direction = 'credit' THEN p.amount ELSE -p.amount END)
  FROM projected_rows p
  JOIN accounts a ON a.id = p.account_id
  WHERE p.user_id = $1
    AND a.currency = $2
    AND a.kind <> 'credit_card'
    AND p.voided_at IS NULL
    AND p.realized_tx_id IS NULL
  GROUP BY p.due_at::date
),
daily AS (
  SELECT day, SUM(delta) AS delta
  FROM events
  GROUP BY day
)
SELECT day, SUM(delta) OVER (ORDER BY day) AS running
FROM daily
ORDER BY day;
```

### 9.4 API routes

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Profile | `GET /api/me`, `PATCH /api/me` (timezone, currencies, buffers, projection settings) |
| Accounts | `GET /api/accounts`, `POST /api/accounts`, `PATCH /api/accounts/:id`, `DELETE /api/accounts/:id` (archive) |
| Categories | `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` |
| Transactions | `GET /api/transactions?from&to&account&category&direction&q`, `POST /api/transactions`, `PATCH /api/transactions/:id`, `POST /api/transactions/:id/void`, `GET /api/transactions/:id/history`, `POST /api/transaction-changes/:id/revert` |
| Recurrences | `GET /api/recurrences`, `POST /api/recurrences`, `PATCH /api/recurrences/:id`, `DELETE /api/recurrences/:id`, `GET /api/recurrences/suggestions` |
| Income | `GET /api/income`, `POST /api/income`, `PATCH /api/income/:id`, `DELETE /api/income/:id` |
| Imports | `POST /api/imports/paste`, `POST /api/imports/csv` (multipart), `POST /api/imports/sms-export` (multipart), `GET /api/imports/:id`, `POST /api/imports/:id/confirm`, `DELETE /api/imports/:id` |
| Projection | `GET /api/projection?currency&from&to`, `GET /api/projection/heatmap?currency`, `GET /api/projection/headroom?currency`, `GET /api/projection/collisions?currency` |
| Budgets | `GET /api/budgets?period`, `PUT /api/budgets/:categoryId`, `DELETE /api/budgets/:categoryId`, `GET /api/budgets/status?period` |
| Groups | `POST /api/groups`, `POST /api/groups/join`, `GET /api/groups`, `GET /api/groups/:id`, `DELETE /api/groups/:id/members/:userId` |
| Splits | `GET /api/groups/:id/splits`, `POST /api/groups/:id/splits`, `PATCH /api/splits/:id`, `DELETE /api/splits/:id`, `GET /api/groups/:id/balances`, `GET /api/groups/:id/settle-up`, `POST /api/groups/:id/settlements` |
| Alerts | `GET /api/alerts?unread=true`, `POST /api/alerts/:id/dismiss` |
| Optional | `GET /api/export.csv`, `GET /api/export.ics` |

### 9.5 Tech stack

**Language:** JavaScript (ES modules) across the web app, API, and projection core. TypeScript is not used. Correctness at the boundaries comes from **runtime validation with Zod** and from unit tests on the projection and settle-up modules.

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React with Vite, React Router | |
| Server state | TanStack Query | Refetch after an import, a void, or a settings change |
| Forms and validation | React Hook Form with Zod | Reuses the shared schemas |
| Styling | Tailwind CSS | |
| Charts | Recharts for the burn-rate line, custom CSS grid for the heatmap | |
| Dates and timezones | Luxon | Projection math depends on correct local-date boundaries |
| CSV parsing (client preview) | Papa Parse | |
| PWA (optional) | vite-plugin-pwa | Needed only for the share target |
| **Backend** | Node.js (current LTS) with Express | |
| Validation | Zod on every route and on LLM output | |
| Database access | Prisma or Drizzle | |
| Auth | JWT access token in memory, refresh token in an httpOnly cookie, argon2 or bcrypt | |
| Security | helmet, express-rate-limit, CORS allowlist | |
| Logging | pino | Structured logs for jobs and imports |
| Parsing | Papa Parse (CSV, server), multer (uploads), chrono-node (fallback dates) | |
| **Database** | PostgreSQL with the `pg_trgm` extension | Used by merchant similarity and category suggestions |
| **Background jobs** | pg-boss | Durable queue stored in PostgreSQL; no Redis |
| Email | Resend or any SMTP provider | Check current free limits |
| **LLM** | Anthropic SDK behind a small wrapper such as `extractTransactions(text)` | Fallback only; regex parsers handle templated SMS |
| **Testing** | Vitest, Supertest, one Playwright end-to-end test | Unit, API, and one happy-path flow |
| **Tooling** | ESLint, Prettier, Docker Compose, GitHub Actions | CI runs lint and tests |

**LLM integration**
- Used only for lines the regex library does not match. The regex set is the primary parser.
- The model is asked for JSON only; the response is validated with Zod.
- A small labeled set of real anonymized SMS (both templated and messy) is kept for measuring accuracy and for regression tests.
- The wrapper allows swapping providers and faking the model in tests. A per-user rate limit and a spending cap are in place.

**Hosting (to be confirmed)**
- Frontend: Vercel, Netlify, or Cloudflare Pages.
- API and job worker: Render, Railway, Fly.io, or a small VPS running Docker Compose.
- Database: Neon or Supabase.
- Confirm before committing: whether the free tier sleeps when idle (a sleeping worker misses alert jobs), whether the database supports `pg_trgm`, and the current free limits of the email and LLM providers.

**Repository layout (npm workspaces)**

```
headroom/
├─ apps/
│  ├─ web/                React app
│  └─ api/                Express API and job workers
├─ packages/
│  ├─ projection/         pure projection, burn rate, headroom functions (no framework imports)
│  ├─ parsers/            regex SMS templates, CSV mappers, trigram matching
│  ├─ settle/             settle-up algorithm, pure
│  └─ shared/             Zod schemas used by web and api
├─ docker-compose.yml
└─ .github/workflows/ci.yml
```

**Conventions**
- The Zod schemas in `packages/shared` are the single source of truth for request, response, and LLM-output shapes.
- The `projection`, `parsers`, and `settle` packages are pure, with no database or framework imports, and are tested against the worked example in section 8.7 and the SMS fixtures.
- Every function that crosses a boundary (HTTP, database, LLM, file upload) validates its input.

**Deliberately not used:** Redis, microservices, GraphQL, Kubernetes, WebSockets, and Next.js, because nothing in the feature set needs them.

---

## 10. Non-Functional Requirements

### Security and privacy
- Passwords hashed; JWTs signed with a secret from environment variables; refresh tokens rotated.
- Input validation on every route; parameterized queries only.
- Rate limiting on auth and import routes; cap import text length to control LLM cost.
- Pasted SMS and uploaded CSVs can contain sensitive data: strip phone numbers, OTPs, and card numbers past the last four digits before storing raw text; show a preview before anything is sent to the LLM; let the user delete any import.
- Authorization checks on every resource: ownership for personal data, membership for group data.
- Settle-up suggestions and group balances are visible only to group members.

### Reliability
- LLM failure must never block the user: the regex parsers and manual entry always work.
- Alert jobs are idempotent: a `UNIQUE` constraint on `(user_id, category_id, period_start, threshold_pct)` prevents a repeated budget alert.
- Import confirmation uses an idempotency key: replaying the same confirmation request creates no duplicate transactions.
- Replacing projected rows for a recurrence happens in a single transaction.

### Performance
- Projection, heatmap, and headroom respond within about 1 second for 2 years of history and 30 days of forecast across up to 10 accounts.

### Usability
- Responsive layout; usable on a phone.
- Importing takes paste, review, confirm. No more than three taps between opening the app and seeing a saved transaction.
- Logging a cash expense takes one amount, one tap for the category, one tap to save.

### Quality
- Unit tests for the projection (the worked example in section 8.7), the burn-rate function, the headroom simulation, the settle-up algorithm (random-balance property test), the recurrence detector, and the SMS parsers (one fixture per template, at least two per bank).
- API tests for auth, imports, idempotency, void and revert, group permissions.
- A Docker Compose setup and a live deployment.

---

## 11. Success Metrics

- **Parser coverage on templated SMS:** on a frozen fixture set of at least 100 real anonymized SMS across the supported banks and UPI apps, the regex library correctly extracts amount, direction, account last-four, and merchant for at least 95% of lines. Report per-bank precision and recall; a miss on amount or direction is a failure regardless of other fields.
- **LLM fallback accuracy:** on a frozen set of at least 50 non-templated transaction messages (free-text, email receipts, foreign bank SMS), the LLM returns an item that passes schema validation and matches the human label on `(amount, direction, account)` for at least 0.80 F1. Report sample size and confusion counts.
- **Duplicate detection:** on a frozen test set with planted duplicates and planted corrections, report precision and recall for each class separately. Target: duplicate recall at least 0.95 with precision at least 0.90; correction recall at least 0.85 with precision at least 0.90.
- **Projection correctness:** the worked example in section 8.7 and at least 3 other fixtures (one with a credit-card bill cycle, one with a late paycheck, one with a mid-month subscription cancellation) produce the expected daily balances and headroom. 100% must pass.
- **Settle-up:** on 100 random group states with 2 to 10 members and balances summing to zero, the suggested transfer count is at most `N - 1` and applying them zeroes every pairwise balance within one minor unit. Target: 100% pass.
- **Time to capture:** in a usability run with at least 5 participants importing the same 10-item SMS batch, median time from opening the import view to confirming is under 45 seconds; report 90th percentile too.
- **Pilot feedback:** 5 to 10 participants complete the same month-end review exercise; report completion rate, time, and each participant's main issue without names or SMS contents.

---

## 12. Milestones

| Phase | Scope |
|---|---|
| **Week 1** | Project setup, auth, accounts, categories, manual transactions, ledger view |
| **Week 2** | Recurring transactions with projected-row rollout, projection as a pure function with unit tests (section 8.7 fixtures), heatmap, headroom tile |
| **Week 3** | Paste import, SMS regex library, LLM fallback, duplicate and correction detection, review screen, change history |
| **Week 4** | CSV upload with column mapping, budgets, alerts, groups and splits, settle-up, deployment |
| **Polish** | Recurrence detection, category auto-assignment improvements, PWA share target, README with architecture diagram and screenshots, pilot testing |

**Minimum viable product:** F1 through F6, including recurring projection, heatmap, headroom, and SMS parsing with the LLM fallback. F7 (shared expenses) and F8 (budgets) are upgrades if time allows. Any deferred item must be removed from the release acceptance checklist and labeled "not in this build" in the README.

---

## 13. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Bank SMS templates change | Keep templates versioned in the database; add a "This SMS parsed wrong" button that logs the raw text for review; the LLM fallback catches changed templates until a new regex is shipped |
| LLM cost or rate limits | Regex parsers handle templated traffic first; cap input length; rate limit per user; batch unmatched lines in one request |
| User pastes something sensitive by accident (OTP, card number) | Strip in pre-processing; show a preview; keep imports deletable; warn in the UI the first time |
| Duplicates slip through because the SMS lacks a reference number | Fuzzy match on date plus amount plus direction plus merchant similarity; show the match on the review screen and let the user confirm |
| Projection misleads because a credit-card bill is treated as cash | Credit-card accounts are projected separately by default; the heatmap excludes credit-available by default; a dedicated card-payment date event moves cash out of checking on the right day |
| Settle-up is "almost minimal" but not provably minimal | Document the limitation; for groups up to 10 the greedy result is almost always minimal; add an optimization pass later if real data shows systematic sub-optimality |
| Burn rate is a median of only two weeks | Make the window configurable; show the raw daily series next to the number so the user can see outliers; alert on sudden week-over-week jumps |
| Students set a buffer of zero and still get alerts | Validate buffer per currency with a default suggestion based on one week of burn rate once there is enough history |
| Free hosting sleeps, so recurrence rollout and alert jobs do not run | Confirm free-tier behavior before choosing a host; run the worker on an always-on instance or trigger it via an external scheduler calling a protected endpoint |
| CSV upload turns into a mapping-UI rabbit hole | Save the mapping per account on first upload; ship 3 built-in presets (HDFC, Chase, generic) and let the user map the rest once |
| Scope creep | Ship F1 through F6 first; treat F7, F8, and the optional extras as upgrades |

---

## 14. Assignment Requirement Mapping

The assignment requires **at least 6 features**. Headroom defines 8:

1. Authentication, profile, accounts, and income
2. Smart import (SMS, UPI, CSV, pasted text)
3. Manual and recurring transactions
4. Ledger and calendar view
5. Cash-flow heatmap and collision warnings
6. Headroom forecast and burn-rate alerts
7. Shared expenses and settle-up
8. Category budgets and burn alerts

---

## 15. Future Work

- Direct bank connections (Plaid in the US, Account Aggregator in India) once the user base justifies the compliance work
- Receipt OCR from phone photos
- Multi-currency consolidation with daily FX rates stored per transaction
- Investment and net-worth tracking as a separate module
- Scheduled "move money" suggestions (sweep excess cash into savings when projected balance stays well above buffer)
- Smarter recurrence detection using full merchant embeddings instead of trigrams
- Shared recurring expenses in groups (one roommate pays the internet; it is auto-split monthly)
- An offline-first PWA mode that queues SMS pastes and syncs on reconnect

---

## 16. Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 4 November 2026 | Initial PRD. Defined the forward-looking cash-position angle, 8 features, projection and settle-up algorithms, data model, API routes, acceptance criteria per feature, worked example, success metrics, milestones, and risks |
