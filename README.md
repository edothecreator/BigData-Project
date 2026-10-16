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

## Roadmap (not in these milestones)

Review Explorer, Market Insights, and a Query Performance Lab are present in the
sidebar marked **Soon** and intentionally non-functional.
