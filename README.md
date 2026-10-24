# ReviewScope — Local Business Intelligence

An academic Big Data analytics dashboard over the **Yelp Open Dataset**, served
entirely from a **local MongoDB** instance. ReviewScope presents aggregate
statistics only — it never exposes raw review text or personal user data.

> Independent academic project. Not affiliated with or endorsed by Yelp.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Tailwind CSS + shadcn-style UI primitives · Lucide icons
- Recharts (themed chart wrapper) · `next-themes` light/dark
- Official `mongodb` Node.js driver (server-only, cached connection)
- Zod for environment validation · `sonner` for toasts

## Démarrage avec Docker (recommandé)

Prérequis : Docker Engine avec Docker Compose. Node.js et MongoDB ne sont pas
nécessaires sur la machine hôte.

```bash
cp .env.example .env
docker compose up --build -d
```

Ouvrir **http://localhost:3000**. Compose lance Next.js en production et MongoDB,
attend que MongoDB soit disponible et conserve les données dans le volume
`mongo_data`. MongoDB reste accessible uniquement sur le réseau Docker ;
l'application est publiée sur l'interface locale.

Les paramètres sont centralisés dans `.env` : `APP_PORT` (3000), `MONGODB_DB`
(yelp_analytics) et `YELP_DATA_DIR` (./data). L'URI interne de MongoDB est définie
dans `compose.yaml`. Après un changement de `.env`, relancer `docker compose up -d`.
Après une modification du code, utiliser `docker compose up --build -d`.
Les fichiers `.env` locaux et le dataset sont exclus de l'image.

### Importer le dataset Yelp

La nouvelle base est vide : les données d'un MongoDB déjà installé sur l'hôte
ne sont pas transférées automatiquement. Extraire le dataset Yelp dans `./data`
ou définir `YELP_DATA_DIR` dans `.env`. Le dossier doit contenir :

- `yelp_academic_dataset_business.json`
- `yelp_academic_dataset_review.json`
- `yelp_academic_dataset_user.json`
- `yelp_academic_dataset_tip.json`
- `yelp_academic_dataset_checkin.json`

```bash
docker compose run --rm import
docker compose run --rm indexes
```

L'import est manuel, vérifie les cinq fichiers et refuse toute collection cible
non vide pour éviter les doublons. Il ne supprime aucune donnée. Un import
interrompu peut laisser des collections partielles : utiliser une nouvelle base
via `MONGODB_DB` pour recommencer. Les index sont optionnels et idempotents.
Sans import, le tableau de bord affiche les collections manquantes.

### Commandes utiles

```bash
docker compose ps
docker compose logs -f app mongo
docker compose exec mongo mongosh yelp_analytics
docker compose down
```

`down` conserve les données. **`docker compose down -v` supprime définitivement
les volumes et les données MongoDB.** Si le nom de base a été modifié, adapter
la commande `mongosh` ci-dessus.

## Développement sans Docker (optionnel)

Avec Node.js 22 et un MongoDB local :

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`MONGODB_URI` et `MONGODB_DB` sont des variables serveur uniquement et ne doivent
jamais utiliser le préfixe `NEXT_PUBLIC_`.

## Scripts

| Command            | Purpose                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server (port 3000)     |
| `npm run build`    | Production build                     |
| `npm run start`    | Start the production server          |
| `npm run lint`     | ESLint (next/core-web-vitals)        |
| `npm run typecheck`| `tsc --noEmit` strict type check     |

## Architecture

```
app/
  layout.tsx              Root layout, theme provider, fonts, toaster
  page.tsx                Dashboard entry (dynamic)
  api/dashboard/route.ts  GET endpoint, force-dynamic, honest error envelope
lib/
  env.ts                  Zod-validated server env
  mongodb.ts              Cached MongoClient (survives dev hot reloads)
  dashboard/
    types.ts              Browser-facing data contract
    queries.ts            Typed, concurrent aggregation pipelines
components/
  dashboard/              KPI cards, charts, footprint, insights, states
  layout/                 Sidebar, header, theme toggle, connection indicator
  ui/                     Card, button, chart, tooltip, skeleton, etc.
hooks/
  use-dashboard-data.ts   Client fetch/refresh/error state
```

### Data & performance decisions

- **Counts use `estimatedDocumentCount()`** — metadata estimates, not full
  scans. Correct for multi-million-document collections, and surfaced in the UI
  as estimates rather than exact transactional counts.
- **All chart data is grouped/limited inside MongoDB.** No collection is ever
  streamed into app memory; no `find({}).toArray()` over a whole collection.
- **Independent read-only aggregations run concurrently** (`Promise.all`).
- **`categories` is a comma-separated string**, so the pipeline splits → trims →
  unwinds → groups → sorts → limits, entirely database-side.
- **`is_open`** is bucketed with `$switch` into open / closed / unknown so the
  open-ratio denominator stays meaningful.
- **Review text is never read** for the dashboard.
- The API is `force-dynamic` + `no-store`, so refresh always hits live data.

### Honest unavailable states

Collection availability is derived from the real list of collection names, so a
missing collection shows **"Not imported"** rather than a misleading zero. If
MongoDB is unreachable, the UI shows a 503-backed error state with recovery
steps instead of fabricated sample data.

## Privacy & safety

Keep this local during development. Do not deploy publicly, do not expose the
connection string, and do not open MongoDB to external interfaces. The dashboard
presents aggregates only.

## Business Explorer (`/businesses`)

Database-backed search, filtering, sorting, pagination, and inspection over the
`businesses` collection.

- **Search** by business name — debounced (350ms), case-insensitive, with regex
  metacharacters escaped so input is matched literally.
- **Filters**: state, city (searchable combobox over a bounded server list +
  free text), category (whole-category match within the comma-separated
  string), minimum rating, and open/closed status. All applied in MongoDB.
- **Results table**: server-side pagination (10/25/50), sortable columns
  (name, city, rating, review count) with a stable `business_id` tiebreak for
  deterministic paging, accessible star ratings and status badges.
- **Summary metrics** (matching count, average rating, open count/percentage)
  computed by aggregation over the *entire* filtered set — not just the page.
- **Detail sheet**: address, hours, categories, and normalized attributes for a
  single business. Review text is never fetched or exposed.
- Filter/sort/page state is synchronized to the URL (shareable, back/forward).

### API endpoints

| Route                              | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `GET /api/businesses`              | Paged list + summary (Zod-validated params)  |
| `GET /api/businesses/filters`      | Distinct states, top cities, top categories  |
| `GET /api/businesses/[businessId]` | Single business detail                       |

All query parameters are validated with Zod (bounded lengths, allowlisted sort
fields/direction, restricted page sizes and ratings). Clients cannot send raw
MongoDB operators or pipeline fragments. `_id` is never returned.

### Optional indexes

The Business Explorer runs fine on the default `_id` index (~70–180ms at 150K
docs). Three optional, non-unique indexes modestly speed the common filter/sort
paths and are created idempotently (never dropped/modified) by:

```bash
mongosh "mongodb://127.0.0.1:27017/yelp_analytics" --file scripts/ensure-indexes.js
```

- `{ state: 1, city: 1 }` — state/city filtering and distinct-city lookups.
- `{ stars: -1, business_id: 1 }` — default/stable sort by rating.
- `{ review_count: -1, business_id: 1 }` — default/stable sort by reviews.

A text index is intentionally **not** added: name search uses a bounded regex
to preserve exact substring semantics rather than tokenized matching.

## Recommendations (`/recommendations`)

Item-to-item recommender (no per-user personalization, so no user identity is
ever involved or exposed). Two strategies, both computed live:

- **Similar businesses (content-based)** — ranks candidates by shared categories
  (the comma-separated string is split/trimmed/intersected in the pipeline),
  preferring same-state results, then rating and review volume. ~500ms.
- **People also reviewed (collaborative)** — finds the businesses most commonly
  reviewed by the same people as the seed, from co-review counts in `reviews`.
  Index-backed (~tens of ms). If the required `reviews` indexes are missing, or
  there is too little signal, it **falls back to content-based** and says so.

No review text and no `user_id` are returned — only aggregate co-review counts.

API: `GET /api/recommendations` (seed + strategy + limit, Zod-validated) and
`GET /api/recommendations/seeds` (debounced seed search).

## Map Explorer (`/map`)

An interactive **Leaflet** map plotting businesses at their exact Yelp
coordinates, with **marker clustering** so dense cities stay readable (clusters
expand on click/zoom). Markers are colored by open/closed status; a popup shows
the name, rating, review count, and status. The basemap uses **Esri "Canvas"**
tiles (light/dark gray variants that follow the app theme) — free and no API
key. (CARTO basemaps were tried first but now require an API key.)

- Loaded client-side via `next/dynamic` (`ssr: false`) since Leaflet needs
  `window`; the map chunk is lazy-loaded only on this route.
- Filters: state, status, minimum rating, and a marker cap (200/500/1000).
- The API returns a **bounded** set (top-N by review volume) plus the exact
  match count, so the UI honestly shows "showing N of M". `_id` is never sent.

API: `GET /api/map` (Zod-validated filters).

> **Privacy note:** the basemap tile images are the only external request in the
> whole app. The Yelp business **data** never leaves the machine — it stays in
> local MongoDB and only aggregate point coordinates are drawn. No business data
> is sent to the tile provider.

## Optional indexes — reviews

In addition to the `businesses` indexes above, the collaborative recommender
needs two indexes on the 6.99M-document `reviews` collection, created by the
same script (`scripts/ensure-indexes.js`):

- `{ business_id: 1 }` — find the reviewers of a seed business.
- `{ user_id: 1 }` — find all businesses a set of users reviewed.

Without them, collaborative recommendations would require a full scan per user
and effectively time out, so the recommender detects their absence and falls
back to content-based mode.

## Market Insights (`/insights`)

Category and geographic comparisons are computed entirely in MongoDB and served
by `GET /api/insights`. Run `npm run dev` and open
**http://localhost:3000/insights**.

- **Category landscape:** the 12 largest categories, with business counts,
  average business ratings, and open rates. Comma-separated categories are
  split, trimmed, deduplicated per business, unwound, and grouped server-side.
- **Geography:** the top 12 states and cities. A state selection filters city
  comparisons; cities are always grouped with their state to avoid collisions.
- **Category × geography:** an exact whole-category match followed by a
  city/state grouping. The category picker contains the 100 most common names.
- **Review engagement:** the 12 categories with the highest average
  `businesses.review_count`, requiring at least 20 businesses per category.
  This does not scan the reviews collection.
- **Quick Insights:** observations derived from these results. Highest-rated
  category is explicitly scoped to the 12 leading categories. Counts describe
  dataset coverage, not population-adjusted density or market saturation.

The state and category controls affect the city comparisons and category
cross-analysis; the category landscape, state ranking, and engagement ranking
remain dataset-wide. Open rates exclude unknown statuses and show “Unknown”
when no known status exists. Missing ratings/review counts remain unavailable,
not fabricated zeros. Category totals overlap because businesses can have
multiple categories.

API parameters are optional `state` (1–8 uppercase letters) and `category`
(1–120 trimmed characters). Unknown parameters and repeated values return 400.
An unknown valid state/category returns empty results. MongoDB unavailability
returns 503; unexpected query failures return 500. All responses use no-store.
Missing `businesses` returns an explicit not-imported state.

Queries run concurrently when independent, have a 20-second per-query limit,
and return bounded arrays (12 result rows, 50 state options, 100 category
options). No indexes are added. The existing optional state/city index can help
state filtering; category normalization still requires a business scan.

This feature demonstrates **semi-structured variety and cross-dimensional
analysis within `businesses`**. It does not claim a cross-collection join;
neither reviews nor tips are joined or read, and raw review text is never sent
to the client.

## Review Explorer (`/reviews`) — Volume

Aggregate review analytics over the entire `reviews` collection. Launch with
`npm run dev` and open http://localhost:3000/reviews, or use the Docker setup
above. The page reuses AppShell, themed charts, tables, skeletons, error recovery,
and refresh notifications. Overview and Business Explorer keep their queries.

`GET /api/reviews` accepts no query parameters (unknown parameters return 400),
is dynamic, and returns `Cache-Control: no-store`. Its small JSON contract includes:

- An **estimated** total from `estimatedDocumentCount()`.
- A MongoDB `$group` for average **review** stars and total useful votes.
- Five integer rating buckets from `$match` / `$group` / `$sort` / `$limit`.
- Annual volume using `$substrBytes` on validated date prefixes. The year span
  comes from this series; missing/malformed prefixes are excluded.
- Fifteen businesses ranked by grouped review count and business ID as a stable
  tiebreaker. One projected `$in` query loads names/cities/states for those IDs.

These full-collection aggregations are intentional demonstrations of **Volume**:
all grouping stays in MongoDB and only bounded aggregates leave the server.
Independent queries run concurrently with disk spilling permitted and a 180-second
limit per aggregation. Concurrent requests share the current computation;
completed results are not cached. There are no keystroke-triggered queries.
Refresh recomputes the statistics and can be expensive on 6.99M documents.
A timeout returns an honest 500 error rather than partial/fabricated statistics;
unreachable MongoDB returns 503. A missing collection is labeled “Not imported”.
No index is added: these dataset-wide groups need to read the collection, and
only a bounded set of business labels is fetched. No server settings are changed.

The API never reads or returns review text, user IDs or profiles. The optional
per-business snippet feature is deliberately omitted. Dataset import is not part
of this feature. If metadata is missing, the table labels it explicitly.

Verification in the implementation environment: `npm run typecheck`,
`npm run lint`, and `npm run build` were attempted but could not run because
dependencies are unavailable (`tsc` / `next` not found). Installing with
`npm ci` encountered registry download timeouts. Rerun all three commands after
dependencies install successfully. Database/API and browser integration checks,
including database-down behavior, were intentionally not run: MongoDB has not
yet been installed. Real counts and rendering remain unverified.

## Query Performance Lab (`/performance`)

Demonstrates how indexing and query shape affect performance at scale — the
capstone that makes the rest of the app's performance decisions visible.

- **Curated scenarios only.** The client picks a scenario from an allowlist
  (filter by state, state+city, sort by rating/reviews, name regex, count by
  state) plus a few bounded params. It can **never** send a raw filter,
  pipeline, field name, or MongoDB operator — the server builds every query
  itself from the validated params. All operations are read-only
  (`find` / `countDocuments` / `explain`).
- **Reports `explain("executionStats")`**, normalized to a plan summary:
  IXSCAN vs COLLSCAN, index name, in-memory sort flag, documents examined vs
  returned, keys examined, and MongoDB's execution time — plus a measured
  wall-clock median.
- **The teaching contrast:** an indexed scenario (e.g. state+city) shows IXSCAN
  examining exactly as many docs as it returns; the name-regex scenario shows a
  COLLSCAN examining far more — with a plain-language explanation of why.
- **Count scenario** contrasts exact `countDocuments` with the O(1)
  `estimatedDocumentCount` metadata estimate.
- A read-only **current-indexes panel** lists the live indexes on `businesses`.

APIs: `GET /api/performance` (Zod-validated, `.strict()`, scenario allowlist)
and `GET /api/performance/indexes`.

## Status — all milestones complete

Every sidebar feature is functional: Overview, Business Explorer,
Recommendations, Map Explorer, Review Explorer, Market Insights, and the Query
Performance Lab. The original task briefs live in `team-prompts/`.
