/*
 * ReviewScope — optional index helper for the Business Explorer.
 *
 * Run manually (NOT automatically by the app) against the local database:
 *   mongosh "mongodb://127.0.0.1:27017/yelp_analytics" --file scripts/ensure-indexes.js
 *
 * Rationale: the Business Explorer filters and sorts on a small set of fields.
 * At ~150K documents a collection scan is already fast (~70-180ms), so these
 * indexes are a modest, optional optimization — created idempotently and only
 * when missing. The script NEVER drops or modifies existing indexes, and does
 * not touch server configuration.
 *
 * Note: case-insensitive, unanchored name search uses a regex that cannot use
 * a btree index efficiently; we intentionally do NOT add a text index because
 * it would change search semantics (tokenized/stemmed matching). Name search
 * remains a bounded regex scan, which is honest about its cost.
 */
const coll = db.getCollection("businesses");

const desired = [
  // Filtering by state, then city, plus distinct-city option lookups.
  { key: { state: 1, city: 1 }, name: "state_1_city_1" },
  // Default/available sort orders combined with the stable secondary key.
  { key: { stars: -1, business_id: 1 }, name: "stars_-1_business_id_1" },
  { key: { review_count: -1, business_id: 1 }, name: "review_count_-1_business_id_1" },
];

const existing = new Set(coll.getIndexes().map((i) => i.name));

for (const idx of desired) {
  if (existing.has(idx.name)) {
    print(`skip  ${idx.name} (already exists)`);
    continue;
  }
  const t0 = Date.now();
  coll.createIndex(idx.key, { name: idx.name });
  print(`created ${idx.name} in ${Date.now() - t0}ms`);
}

print("done. current indexes:");
printjson(coll.getIndexes().map((i) => i.name));
