import "server-only";

import type { Collection, Document } from "mongodb";

import { getDb } from "@/lib/mongodb";
import {
  getScenario,
  type ScenarioId,
  type ScenarioParams,
  type ScenarioPlan,
} from "@/lib/performance/scenarios";
import type {
  ExecutionMetrics,
  IndexesResult,
  PerformanceResult,
  PlanSummary,
} from "@/lib/performance/types";

const COLLECTION = "businesses";

/**
 * Walk the winningPlan down its inputStage chain to the leaf access stage
 * (IXSCAN / COLLSCAN), collecting the top stage and any index name + whether an
 * in-memory SORT happened.
 */
function summarizePlan(winningPlan: Document): PlanSummary {
  const topStage = String(winningPlan.stage ?? "UNKNOWN");
  let inMemorySort = false;
  let node: Document | undefined = winningPlan;
  let leaf: Document = winningPlan;

  while (node) {
    if (node.stage === "SORT") inMemorySort = true;
    if (node.inputStage) {
      node = node.inputStage as Document;
      leaf = node;
    } else {
      break;
    }
  }

  const scanStage = String(leaf.stage ?? topStage);
  const indexName =
    typeof leaf.indexName === "string" ? leaf.indexName : null;

  return {
    usedIndex: scanStage === "IXSCAN",
    scanStage,
    topStage,
    indexName,
    inMemorySort,
  };
}

function extractMetrics(executionStats: Document): ExecutionMetrics {
  return {
    nReturned: Number(executionStats.nReturned ?? 0),
    totalDocsExamined: Number(executionStats.totalDocsExamined ?? 0),
    totalKeysExamined: Number(executionStats.totalKeysExamined ?? 0),
    executionTimeMillis: Number(executionStats.executionTimeMillis ?? 0),
  };
}

/** Render the effective query as a readable one-liner (never raw user input unescaped into HTML — this is plain text). */
function describeQuery(plan: ScenarioPlan): string {
  const parts: string[] = [];
  parts.push(`filter ${JSON.stringify(plan.filter)}`);
  if (plan.sort) parts.push(`sort ${JSON.stringify(plan.sort)}`);
  if (typeof plan.limit === "number") parts.push(`limit ${plan.limit}`);
  return parts.join(" · ");
}

/** Build the explainable cursor/command for a find scenario. */
function runFindExplain(coll: Collection, plan: ScenarioPlan) {
  let cursor = coll.find(plan.filter);
  if (plan.sort) cursor = cursor.sort(plan.sort);
  if (typeof plan.limit === "number") cursor = cursor.limit(plan.limit);
  return cursor;
}

/** Median of a small set of wall-clock samples, to smooth out noise. */
async function measureMedian(
  run: () => Promise<unknown>,
  samples = 3,
): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await run();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const mid = Math.floor(times.length / 2);
  return Number(times[mid]!.toFixed(1));
}

/**
 * Execute one allowlisted scenario and return a normalized result: the
 * explain() plan summary + execution metrics, a measured wall-clock median, and
 * the result count. All operations are READ-ONLY (find / count / explain).
 */
export async function runScenario(
  scenarioId: ScenarioId,
  params: ScenarioParams,
): Promise<PerformanceResult> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);
  const def = getScenario(scenarioId);
  const plan = def.build(params);

  let planSummary: PlanSummary;
  let metrics: ExecutionMetrics;
  let measuredMs: number;
  let resultCount: number;
  let estimatedCount: number | null = null;

  if (plan.kind === "count") {
    // explain the count, measure it, and also fetch the O(1) estimate.
    const explain = (await coll
      .find(plan.filter)
      .explain("executionStats")) as Document;
    planSummary = summarizePlan(
      (explain.queryPlanner as Document).winningPlan as Document,
    );
    metrics = extractMetrics(explain.executionStats as Document);

    measuredMs = await measureMedian(() => coll.countDocuments(plan.filter));
    resultCount = await coll.countDocuments(plan.filter);
    estimatedCount = await coll.estimatedDocumentCount();
  } else {
    const explain = (await runFindExplain(coll, plan).explain(
      "executionStats",
    )) as Document;
    planSummary = summarizePlan(
      (explain.queryPlanner as Document).winningPlan as Document,
    );
    metrics = extractMetrics(explain.executionStats as Document);

    measuredMs = await measureMedian(() =>
      runFindExplain(coll, plan).toArray(),
    );
    resultCount = metrics.nReturned;
  }

  return {
    scenarioId,
    label: def.label,
    description: def.description,
    kind: plan.kind,
    querySummary: describeQuery(plan),
    plan: planSummary,
    metrics,
    measuredMs,
    resultCount,
    estimatedCount,
    generatedAt: new Date().toISOString(),
  };
}

/** List the current indexes on the businesses collection (read-only). */
export async function listBusinessIndexes(): Promise<IndexesResult> {
  const db = await getDb();
  const indexes = await db.collection(COLLECTION).indexes();

  return {
    collection: COLLECTION,
    indexes: indexes.map((idx) => ({
      name: String(idx.name),
      keys: Object.entries(idx.key as Record<string, number | string>).map(
        ([field, direction]) => ({ field, direction }),
      ),
    })),
    generatedAt: new Date().toISOString(),
  };
}
