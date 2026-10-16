/*
 * ReviewScope — optional index helper.
 *
 * Run manually (NOT automatically by the app) against the local database:
 *   mongosh "mongodb://127.0.0.1:27017/yelp_analytics" --file scripts/ensure-indexes.js
 *
 * All indexes are created idempotently and only when missing. The script NEVER
 * drops or modifies existing indexes, and does not touch server configuration.
 *
 * ---------------------------------------------------------------------------
 * businesses (Business Explorer + Recommendations + Map)
 * ---------------------------------------------------------------------------
 * At ~150K documents a collection scan is already fast (~70-180ms), so these
 * are a modest optimization for the common filter/sort paths.
 *
 * Note: case-insensitive, unanchored name search uses a regex that cannot use
 * a btree index efficiently; we intentionally do NOT add a text index because
 * it would change search semantics (tokenized/stemmed matching).
 *
 * ---------------------------------------------------------------------------
 * reviews (Collaborative-filtering recommender)
 * ---------------------------------------------------------------------------
 * The "people who reviewed this also reviewed..." recommender needs to (a) find
 * the reviewers of a seed business and (b) find the other businesses those users
 * reviewed. On 6.99M reviews with only the default _id index, step (b) is a full
 * collection scan per user and effectively times out. These two single-field
 * indexes make the recommender run in well under 100ms. They are REQUIRED for
 * the collaborative recommender to be usable live; without them the app falls
 * back to content-based recommendations only.
 *
 * One-time build cost on this machine was ~50s for business_id (large collection).
 */

function ensure(collName, desired) {
  const coll = db.getCollection(collName);
  const existing = new Set(coll.getIndexes().map((i) => i.name));
  print(`\n[${collName}]`);
  for (const idx of desired) {
    if (existing.has(idx.name)) {
      print(`  skip    ${idx.name} (already exists)`);
      continue;
    }
    const t0 = Date.now();
    coll.createIndex(idx.key, { name: idx.name });
    print(`  created ${idx.name} in ${Date.now() - t0}ms`);
  }
  print(
    `  indexes now: ${JSON.stringify(coll.getIndexes().map((i) => i.name))}`,
  );
}

ensure("businesses", [
  // Filtering by state, then city, plus distinct-city option lookups.
  { key: { state: 1, city: 1 }, name: "state_1_city_1" },
  // Default/available sort orders combined with the stable secondary key.
  { key: { stars: -1, business_id: 1 }, name: "stars_-1_business_id_1" },
  { key: { review_count: -1, business_id: 1 }, name: "review_count_-1_business_id_1" },
]);

ensure("reviews", [
  // Find reviewers of a seed business (collaborative recommender, step 1).
  { key: { business_id: 1 }, name: "business_id_1" },
  // Find all businesses a set of users reviewed (collaborative recommender, step 2).
  { key: { user_id: 1 }, name: "user_id_1" },
]);

print("\ndone.");
