import type { ScenarioId } from "@/lib/performance/scenarios";

/**
 * Browser-facing types for the Query Performance Lab. Everything is a plain,
 * normalized summary — never the raw (huge) explain object or full documents.
 */

/** Lightweight scenario descriptor for the picker. */
export interface ScenarioInfo {
  id: ScenarioId;
  label: string;
  description: string;
  params: Array<"state" | "city" | "search">;
  expectedIndex: string | null;
}

/** Normalized explain() summary. */
export interface PlanSummary {
  /** True when the plan used an index (IXSCAN), false for a COLLSCAN. */
  usedIndex: boolean;
  /** Leaf access stage, e.g. "IXSCAN" or "COLLSCAN". */
  scanStage: string;
  /** The top-level plan stage, e.g. "LIMIT", "FETCH", "SORT". */
  topStage: string;
  /** Index name when one was used. */
  indexName: string | null;
  /** True if MongoDB performed an in-memory SORT stage (no sorted index). */
  inMemorySort: boolean;
}

export interface ExecutionMetrics {
  nReturned: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  /** MongoDB's own reported execution time for the explain run. */
  executionTimeMillis: number;
}

/** Full result of running one scenario. */
export interface PerformanceResult {
  scenarioId: ScenarioId;
  label: string;
  description: string;
  kind: "find" | "count";
  /** Human-readable summary of the effective query (filter/sort/limit). */
  querySummary: string;
  plan: PlanSummary;
  metrics: ExecutionMetrics;
  /** Wall-clock time we measured around the actual query (median of runs). */
  measuredMs: number;
  /** Result count (find: docs matched up to limit view; count: exact total). */
  resultCount: number;
  /**
   * For the count scenario only: the O(1) metadata estimate, to contrast with
   * the exact countDocuments cost.
   */
  estimatedCount: number | null;
  generatedAt: string;
}

/** One index on the businesses collection (read-only listing). */
export interface IndexInfo {
  name: string;
  /** Key spec rendered as "field: dir" pairs. */
  keys: { field: string; direction: number | string }[];
}

export interface IndexesResult {
  collection: string;
  indexes: IndexInfo[];
  generatedAt: string;
}

export interface PerformanceApiError {
  error: true;
  code: "VALIDATION_FAILED" | "DB_UNREACHABLE" | "QUERY_FAILED";
  message: string;
  issues?: { path: string; message: string }[];
}
