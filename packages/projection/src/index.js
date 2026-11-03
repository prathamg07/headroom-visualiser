import { DateTime } from 'luxon';

/**
 * Classify a projected end-of-day balance into Bauhaus semantic status:
 * - 'safe' (blue-fill): balance >= buffer + safeMargin
 * - 'tight' (yellow-fill): buffer <= balance < buffer + safeMargin
 * - 'danger' (red-fill): balance < buffer
 */
export function classifyDay(balance, buffer, safeMargin = 0) {
  if (balance < buffer) {
    return 'danger';
  }
  if (balance < buffer + safeMargin) {
    return 'tight';
  }
  return 'safe';
}

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate median daily discretionary spending over the last W days (default 14)
 * Returns null if fewer than 7 days of history exist.
 */
export function calculateBurnRate({
  transactions = [],
  categories = [],
  todayStr,
  burnWindowDays = 14,
  zone = 'UTC',
  earliestHistoryDate = null,
}) {
  const fixedCategoryIds = new Set(
    categories.filter((c) => c.is_fixed).map((c) => c.id)
  );

  const today = todayStr
    ? DateTime.fromISO(todayStr, { zone }).startOf('day')
    : DateTime.now().setZone(zone).startOf('day');

  // Check history span if provided
  if (earliestHistoryDate) {
    const earliest = DateTime.fromISO(earliestHistoryDate, { zone }).startOf('day');
    const historyDays = today.diff(earliest, 'days').days;
    if (historyDays < 7) {
      return null;
    }
  }

  // Aggregate discretionary debits per day for the window [today - burnWindowDays, today - 1]
  const dailyDebits = new Map();
  for (let i = 1; i <= burnWindowDays; i++) {
    const dayKey = today.minus({ days: i }).toISODate();
    dailyDebits.set(dayKey, 0);
  }

  for (const tx of transactions) {
    if (tx.voided_at) continue;
    if (tx.direction !== 'debit') continue;
    if (tx.category_id && fixedCategoryIds.has(tx.category_id)) continue;
    if (tx.is_fixed) continue;

    const txDate = DateTime.fromISO(tx.posted_at, { zone }).toISODate();
    if (dailyDebits.has(txDate)) {
      dailyDebits.set(dailyDebits.get(txDate) + Number(tx.amount));
    }
  }

  const values = Array.from(dailyDebits.values());
  return calculateMedian(values);
}

/**
 * Calculate daily end-of-day balances and heatmap cells for the next N days.
 * Applies discretionary burn rate erosion for future days (PRD Section 8.1 & 8.7).
 */
export function calculateDailyBalances({
  accounts = [],
  transactions = [],
  projectedRows = [],
  todayStr,
  horizonDays = 30,
  currency = 'INR',
  buffer = 2000,
  burnRate = 0,
  includeCreditAvail = false,
  zone = 'UTC',
}) {
  const today = todayStr
    ? DateTime.fromISO(todayStr, { zone }).startOf('day')
    : DateTime.now().setZone(zone).startOf('day');

  // Filter accounts by currency
  const targetAccounts = accounts.filter(
    (a) => a.currency === currency && (includeCreditAvail || a.kind !== 'credit_card')
  );
  const targetAccountIds = new Set(targetAccounts.map((a) => a.id));

  // Compute opening balance sum
  const baseOpeningBalance = targetAccounts.reduce(
    (acc, a) => acc + Number(a.opening_balance || 0),
    0
  );

  // Group posted transactions by date
  const postedByDate = new Map();
  for (const tx of transactions) {
    if (tx.voided_at) continue;
    if (!targetAccountIds.has(tx.account_id)) continue;
    const dateKey = DateTime.fromISO(tx.posted_at, { zone }).toISODate();
    if (!postedByDate.has(dateKey)) {
      postedByDate.set(dateKey, []);
    }
    postedByDate.get(dateKey).push(tx);
  }

  // Group projected rows by date
  const projectedByDate = new Map();
  for (const row of projectedRows) {
    if (row.voided_at || row.realized_tx_id) continue;
    if (!targetAccountIds.has(row.account_id)) continue;
    const dateKey = DateTime.fromISO(row.due_at, { zone }).toISODate();
    if (!projectedByDate.has(dateKey)) {
      projectedByDate.set(dateKey, []);
    }
    projectedByDate.get(dateKey).push(row);
  }

  // Cumulative walk across all historical posted transactions up to today
  let runningBalance = baseOpeningBalance;

  // Apply historical transactions strictly prior to today
  for (const [dateKey, txList] of postedByDate.entries()) {
    const txDate = DateTime.fromISO(dateKey, { zone });
    if (txDate < today) {
      for (const tx of txList) {
        const amt = Number(tx.amount);
        runningBalance += tx.direction === 'credit' ? amt : -amt;
      }
    }
  }

  const days = [];
  const safeMargin = Math.max(burnRate, 0);

  // Walk from today (day 0) through horizonDays
  for (let d = 0; d <= horizonDays; d++) {
    const curDate = today.plus({ days: d });
    const curDateKey = curDate.toISODate();

    const postedToday = postedByDate.get(curDateKey) || [];
    const projectedToday = projectedByDate.get(curDateKey) || [];

    let postedNet = 0;
    for (const tx of postedToday) {
      const amt = Number(tx.amount);
      postedNet += tx.direction === 'credit' ? amt : -amt;
    }

    let projectedNet = 0;
    for (const row of projectedToday) {
      const amt = Number(row.amount);
      projectedNet += row.direction === 'credit' ? amt : -amt;
    }

    // Apply posted and scheduled events
    runningBalance += postedNet + projectedNet;

    // For future days (d >= 1), apply discretionary burn rate erosion (PRD 8.1 & 8.7)
    if (d >= 1) {
      runningBalance -= burnRate;
    }

    const status = classifyDay(runningBalance, buffer, safeMargin);

    days.push({
      date: curDateKey,
      dayIndex: d,
      balance: runningBalance,
      postedNet,
      projectedNet,
      burnRateErosion: d >= 1 ? burnRate : 0,
      events: [
        ...postedToday.map((t) => ({ ...t, isProjected: false })),
        ...projectedToday.map((r) => ({ ...r, isProjected: true })),
      ],
      status, // 'safe' | 'tight' | 'danger'
      isCollision: false,
    });
  }

  // Detect and flag collisions (PRD: run of >= 2 adjacent red/danger days)
  tagCollisions(days);

  return days;
}

/**
 * Simulate headroom forward in days
 * balance(0) = combined position at end of today
 * balance(d) = balance(d-1) - burnRate + projectedCredits(d) - projectedFixedDebits(d)
 * headroom   = smallest d > 0 with balance(d) < buffer, capped at horizon
 */
export function simulateHeadroom({
  startingBalance,
  burnRate = 0,
  projectedCreditsByDay = new Map(),
  projectedFixedDebitsByDay = new Map(),
  buffer = 2000,
  horizonDays = 30,
  todayStr,
  zone = 'UTC',
}) {
  const today = todayStr
    ? DateTime.fromISO(todayStr, { zone }).startOf('day')
    : DateTime.now().setZone(zone).startOf('day');

  let currentBalance = startingBalance;
  let headroomDays = horizonDays;
  let headroomDate = today.plus({ days: horizonDays }).toISODate();
  const dailyPath = [{ date: today.toISODate(), day: 0, balance: currentBalance }];

  for (let d = 1; d <= horizonDays; d++) {
    const curDate = today.plus({ days: d });
    const dateKey = curDate.toISODate();

    const credits = projectedCreditsByDay.get(dateKey) || 0;
    const fixedDebits = projectedFixedDebitsByDay.get(dateKey) || 0;

    currentBalance = currentBalance - burnRate + credits - fixedDebits;

    dailyPath.push({ date: dateKey, day: d, balance: currentBalance });

    if (currentBalance < buffer && headroomDays === horizonDays) {
      headroomDays = d;
      headroomDate = dateKey;
    }
  }

  return {
    headroomDays,
    headroomDate,
    dailyPath,
  };
}

/**
 * Tag runs of >= 2 adjacent red days as collisions
 */
function tagCollisions(days) {
  let currentRun = [];

  for (let i = 0; i < days.length; i++) {
    if (days[i].status === 'danger') {
      currentRun.push(days[i]);
    } else {
      if (currentRun.length >= 2) {
        for (const item of currentRun) {
          item.isCollision = true;
        }
      }
      currentRun = [];
    }
  }

  if (currentRun.length >= 2) {
    for (const item of currentRun) {
      item.isCollision = true;
    }
  }
}

/**
 * Extract collision runs as structured collision warning objects
 */
export function detectCollisions(dailyBalances) {
  const collisions = [];
  let currentRun = [];

  for (const day of dailyBalances) {
    if (day.status === 'danger') {
      currentRun.push(day);
    } else {
      if (currentRun.length >= 2) {
        collisions.push({
          startDate: currentRun[0].date,
          endDate: currentRun[currentRun.length - 1].date,
          lengthDays: currentRun.length,
          days: [...currentRun],
        });
      }
      currentRun = [];
    }
  }

  if (currentRun.length >= 2) {
    collisions.push({
      startDate: currentRun[0].date,
      endDate: currentRun[currentRun.length - 1].date,
      lengthDays: currentRun.length,
      days: [...currentRun],
    });
  }

  return collisions;
}
