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

## Prerequisites

- Node.js 18.18+ (tested on 24.x)
- A local MongoDB server running at `mongodb://127.0.0.1:27017`
- A `yelp_analytics` database with the imported collections:
  `businesses`, `reviews`, `users`, `tips`, `checkins`

## Setup

```bash
npm install
cp .env.example .env.local   # values already default to the local setup
npm run dev
```

Then open **http://localhost:3000**.

### Environment (`.env.local`, server-only)

```
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=yelp_analytics
```

These are never exposed to the browser (no `NEXT_PUBLIC_` prefix) and
`.env.local` is git-ignored.

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

## Roadmap (not in these milestones)

Review Explorer and a Query Performance Lab are present in the
sidebar marked **Soon** and intentionally non-functional.
