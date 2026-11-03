/**
 * Trigram similarity algorithm matching PostgreSQL pg_trgm logic
 * Used for merchant similarity matching and category auto-assignment
 */

function extractTrigrams(str) {
  const normalized = `  ${(str || '').toLowerCase().trim()} `;
  const trigrams = new Set();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.slice(i, i + 3));
  }
  return trigrams;
}

export function trigramSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1.toLowerCase().trim() === str2.toLowerCase().trim()) return 1.0;

  const tri1 = extractTrigrams(str1);
  const tri2 = extractTrigrams(str2);

  if (tri1.size === 0 || tri2.size === 0) return 0;

  let intersectionCount = 0;
  for (const tri of tri1) {
    if (tri2.has(tri)) {
      intersectionCount++;
    }
  }

  const unionCount = tri1.size + tri2.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}
