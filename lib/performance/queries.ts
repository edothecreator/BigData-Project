import "server-only";

import type { Collection, Document, Hint } from "mongodb";

import { getDb } from "@/lib/mongodb";
import {
  getScenarioInfo,
  MANAGED_INDEXES,
  type ManagedIndexId,
  type ScenarioId,
} from "@/lib/performance/catalog";
import {
  buildScenario,
  type ScenarioParams,
  type ScenarioPlan,
} from "@/lib/performance/scenarios";
import type {
  EnsureIndexResult,
  ExecutionMetrics,
  IndexesResult,
  PerformanceResult,
  PlanRun,
  PlanSummary,
  SampleRow,
} from "@/lib/performance/types";

/*
 * READ-ONLY by construction: this module only calls find / aggregate($match,
 * $group) / countDocuments / estimatedDocumentCount / explain / listIndexes.
 * The single exception is ensureManagedIndex(), which may call createIndex for
 * one of three hardcoded, non-unique indexes — and never drops anything.
 */

const COLLECTION = "businesses";

/** Real executions timed per plan; the median is reported. */
export const TIMING_SAMPLES = 3;

/** Server-side cap on any single operation so a scan can never run away. */
const MAX_TIME_MS = 15_000;

/** Forces a collection scan for the "without index" baseline. */
const NATURAL_HINT: Hint = { $natural: 1 };

/** Only the fields the tiny sample needs — never full documents. */
const SAMPLE_PROJECTION = { _id: 0, name: 1, city: 1, state: 1 } as const;
const SAMPLE_SIZE = 3;

/** Leaf stages that read an index rather than the collection. */
const INDEX_STAGES = new Set([
  "IXSCAN",
  "COUNT_SCAN",
  "DISTINCT_SCAN",
  "IDHACK",
  "EXPRESS_IXSCAN",
  "EXPRESS_IDHACK",
  "EXPRESS_CLUSTERED_IXSCAN",
]);

// ---------------------------------------------------------------------------
// explain() normalization
// ---------------------------------------------------------------------------

/**
 * Collapse a winningPlan into a small summary. Handles both the classic engine
 * shape and SBE (where the tree sits under `queryPlan`), and walks inputStage /
 * inputStages depth-first down to the leaf access stage.
 */
export function summarizePlan(winningPlan: Document): PlanSummary {
  const root = (winningPlan.queryPlan as Document | undefined) ?? winningPlan;
  const stages: string[] = [];
  let inMemorySort = false;
  let leaf: Document = root;
  let indexName: string | null = null;
  let usedIndex = false;

  const visit = (node: Document) => {
    const stage = String(node.stage ?? "UNKNOWN");
    stages.push(stage);
    if (stage === "SORT") inMemorySort = true;
    if (INDEX_STAGES.has(stage)) {
      usedIndex = true;
      if (!indexName && typeof node.indexName === "string") {
        indexName = node.indexName;
      }
    }
    const children: Document[] = node.inputStage
      ? [node.inputStage as Document]
      : Array.isArray(node.inputStages)
        ? (node.inputStages as Document[])
        : [];
    if (children.length === 0 && leaf === root) leaf = node;
    children.forEach(visit);
  };
  visit(root);

  return {
    usedIndex,
    scanStage: String(leaf.stage ?? "UNKNOWN"),
    topStage: stages[0] ?? "UNKNOWN",
    stages,
    indexName,
    inMemorySort,
  };
}

function extractMetrics(executionStats: Document | undefined): ExecutionMetrics {
  const s = executionStats ?? {};
  return {
    nReturned: Number(s.nReturned ?? 0),
    totalDocsExamined: Number(s.totalDocsExamined ?? 0),
    totalKeysExamined: Number(s.totalKeysExamined ?? 0),
    executionTimeMillis: Number(s.executionTimeMillis ?? 0),
  };
}

/**
 * Pull { winningPlan, executionStats } out of a find or aggregate explain.
 * Aggregations fully pushed into the query engine report at the top level;
 * otherwise the first stage is a `$cursor` wrapping the query explain.
 */
function readExplain(explain: Document): {
  winningPlan: Document;
  executionStats: Document | undefined;
} {
  if (explain.queryPlanner) {
    return {
      winningPlan: (explain.queryPlanner as Document).winningPlan as Document,
      executionStats: explain.executionStats as Document | undefined,
    };
  }
  const cursor = Array.isArray(explain.stages)
    ? ((explain.stages as Document[])[0]?.$cursor as Document | undefined)
    : undefined;
  if (cursor?.queryPlanner) {
    return {
      winningPlan: (cursor.queryPlanner as Document).winningPlan as Document,
      executionStats: cursor.executionStats as Document | undefined,
    };
  }
  throw new Error("Unrecognized explain() output shape.");
}

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------

async function timeSamples<T>(
  run: () => Promise<T>,
): Promise<{ samplesMs: number[]; medianMs: number; last: T }> {
  const samplesMs: number[] = [];
  let last: T | undefined;
  for (let i = 0; i < TIMING_SAMPLES; i++) {
    const t0 = performance.now();
    last = await run();
    samplesMs.push(Number((performance.now() - t0).toFixed(1)));
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  return {
    samplesMs,
    medianMs: sorted[Math.floor(sorted.length / 2)]!,
    last: last as T,
  };
}

// ---------------------------------------------------------------------------
// Scenario execution
// ---------------------------------------------------------------------------

type FindPlan = Extract<ScenarioPlan, { kind: "find" }>;
type CountPlan = Extract<ScenarioPlan, { kind: "count" }>;

function findCursor(coll: Collection, plan: FindPlan, hint?: Hint) {
  let cursor = coll
    .find(plan.filter, { projection: SAMPLE_PROJECTION })
    .maxTimeMS(MAX_TIME_MS);
  if (plan.sort) cursor = cursor.sort(plan.sort);
  cursor = cursor.limit(plan.limit);
  if (hint) cursor = cursor.hint(hint);
  return cursor;
}

/** The exact pipeline the driver issues for countDocuments(filter). */
function countPipeline(plan: CountPlan): Document[] {
  return [{ $match: plan.filter }, { $group: { _id: 1, n: { $sum: 1 } } }];
}

async function runFind(
  coll: Collection,
  plan: FindPlan,
  hint?: Hint,
): Promise<{ run: PlanRun; docs: Document[] }> {
  const explain = await findCursor(coll, plan, hint).explain("executionStats");
  const { winningPlan, executionStats } = readExplain(explain);
  const timing = await timeSamples(() => findCursor(coll, plan, hint).toArray());
  return {
    run: {
      plan: summarizePlan(winningPlan),
      metrics: extractMetrics(executionStats),
      measuredMs: timing.medianMs,
      samplesMs: timing.samplesMs,
    },
    docs: timing.last,
  };
}

async function runCount(
  coll: Collection,
  plan: CountPlan,
  hint?: Hint,
): Promise<{ run: PlanRun; count: number }> {
  const options = { maxTimeMS: MAX_TIME_MS, ...(hint ? { hint } : {}) };
  const explain = await coll
    .aggregate(countPipeline(plan), options)
    .explain("executionStats");
  const { winningPlan, executionStats } = readExplain(explain);
  const timing = await timeSamples(() =>
    coll.countDocuments(plan.filter, options),
  );
  return {
    run: {
      plan: summarizePlan(winningPlan),
      metrics: extractMetrics(executionStats),
      measuredMs: timing.medianMs,
      samplesMs: timing.samplesMs,
    },
    count: timing.last,
  };
}

function describeQuery(plan: ScenarioPlan): string {
  if (plan.kind === "count") {
    return `db.businesses.countDocuments(${JSON.stringify(plan.filter)})`;
  }
  let q = `db.businesses.find(${JSON.stringify(plan.filter)})`;
  if (plan.sort) q += `.sort(${JSON.stringify(plan.sort)})`;
  q += `.limit(${plan.limit})`;
  return q;
}

function toSample(docs: Document[]): SampleRow[] {
  return docs.slice(0, SAMPLE_SIZE).map((d) => ({
    name: String(d.name ?? ""),
    city: String(d.city ?? ""),
    state: String(d.state ?? ""),
  }));
}

/**
 * Run one allowlisted scenario twice — once with the planner's choice and once
 * forced to a collection scan via hint({ $natural: 1 }) — and return normalized
 * explain summaries, metrics and median timings. The two runs are sequential so
 * they don't skew each other's timings.
 */
export async function runScenario(
  scenarioId: ScenarioId,
  params: ScenarioParams,
): Promise<PerformanceResult> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);
  const info = getScenarioInfo(scenarioId);
  const plan = buildScenario(scenarioId, params);

  const base = {
    scenarioId,
    label: info.label,
    kind: plan.kind,
    querySummary: describeQuery(plan),
    timingSamples: TIMING_SAMPLES,
    generatedAt: new Date().toISOString(),
  };

  if (plan.kind === "count") {
    const planner = await runCount(coll, plan);
    const baseline = await runCount(coll, plan, NATURAL_HINT);
    const estimate = await timeSamples(() =>
      coll.estimatedDocumentCount({ maxTimeMS: MAX_TIME_MS }),
    );
    return {
      ...base,
      planner: planner.run,
      baseline: baseline.run,
      resultCount: planner.count,
      estimate: { count: estimate.last, measuredMs: estimate.medianMs },
      sample: [],
    };
  }

  const planner = await runFind(coll, plan);
  const baseline = await runFind(coll, plan, NATURAL_HINT);
  return {
    ...base,
    planner: planner.run,
    baseline: baseline.run,
    resultCount: planner.docs.length,
    estimate: null,
    sample: toSample(planner.docs),
  };
}

// ---------------------------------------------------------------------------
// Indexes (list: read-only; ensure: allowlisted create-if-missing, never drop)
// ---------------------------------------------------------------------------

function sameKeyPattern(
  key: Document,
  wanted: { field: string; direction: 1 | -1 }[],
): boolean {
  const entries = Object.entries(key);
  return (
    entries.length === wanted.length &&
    entries.every(
      ([field, dir], i) =>
        field === wanted[i]!.field && Number(dir) === wanted[i]!.direction,
    )
  );
}

async function readIndexes(coll: Collection): Promise<IndexesResult> {
  const indexes = await coll.indexes();
  return {
    collection: COLLECTION,
    indexes: indexes.map((idx) => ({
      name: String(idx.name),
      keys: Object.entries(idx.key as Record<string, number | string>).map(
        ([field, direction]) => ({ field, direction }),
      ),
    })),
    managed: Object.values(MANAGED_INDEXES).map((spec) => ({
      id: spec.id,
      present: indexes.some(
        (idx) =>
          idx.name === spec.id || sameKeyPattern(idx.key as Document, spec.keys),
      ),
    })),
    generatedAt: new Date().toISOString(),
  };
}

/** List the current indexes on businesses (read-only). */
export async function listBusinessIndexes(): Promise<IndexesResult> {
  const db = await getDb();
  return readIndexes(db.collection(COLLECTION));
}

/**
 * Idempotently create ONE allowlisted index if it is missing. Only the fixed
 * key spec from MANAGED_INDEXES is used (non-unique, default options). If an
 * index with the same name or key pattern already exists this is a no-op.
 * There is deliberately no drop/modify counterpart.
 */
export async function ensureManagedIndex(
  id: ManagedIndexId,
): Promise<EnsureIndexResult> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);
  const spec = MANAGED_INDEXES[id];

  const before = await readIndexes(coll);
  if (before.managed.find((m) => m.id === id)?.present) {
    return { ...before, index: id, created: false, buildMs: null };
  }

  const keys: Record<string, 1 | -1> = {};
  for (const k of spec.keys) keys[k.field] = k.direction;

  const t0 = performance.now();
  await coll.createIndex(keys, { name: spec.id });
  const buildMs = Number((performance.now() - t0).toFixed(1));

  const after = await readIndexes(coll);
  return { ...after, index: id, created: true, buildMs };
}
