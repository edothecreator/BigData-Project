import type { BusinessApiError } from "@/lib/businesses/types";
import type { ManagedIndexId, ScenarioId } from "@/lib/performance/catalog";

/**
 * Browser-facing types for the Query Performance Lab. Everything is a plain,
 * normalized summary — never the raw (huge) explain object or full documents.
 */

/** Normalized explain() winning-plan summary. */
export interface PlanSummary {
  /** True when the access path used an index (IXSCAN / COUNT_SCAN …). */
  usedIndex: boolean;
  /** Leaf access stage, e.g. "IXSCAN", "COUNT_SCAN", "COLLSCAN". */
  scanStage: string;
  /** Top-level plan stage, e.g. "LIMIT", "FETCH", "SORT", "GROUP". */
  topStage: string;
  /** Stage chain from the top down, e.g. ["LIMIT", "FETCH", "IXSCAN"]. */
  stages: string[];
  /** Index name when one was used. */
  indexName: string | null;
  /** True if MongoDB had to sort in memory (no index provided the order). */
  inMemorySort: boolean;
}

/** Numbers from explain("executionStats"). */
export interface ExecutionMetrics {
  nReturned: number;
  totalDocsExamined: number;
  totalKeysExamined: number;
  /** MongoDB's own reported execution time for the explain run. */
  executionTimeMillis: number;
}

/** One measured execution of a scenario (planner's choice or forced scan). */
export interface PlanRun {
  plan: PlanSummary;
  metrics: ExecutionMetrics;
  /** Median server-side wall-clock time over TIMING_SAMPLES real executions. */
  measuredMs: number;
  /** Every wall-clock sample, in run order (for transparency). */
  samplesMs: number[];
}

/** A tiny, display-only sample of matching businesses (3 rows max). */
export interface SampleRow {
  name: string;
  city: string;
  state: string;
}

export interface PerformanceResult {
  scenarioId: ScenarioId;
  label: string;
  kind: "find" | "count";
  /** Human-readable rendering of the server-built query. */
  querySummary: string;
  /** What the query planner chose on its own. */
  planner: PlanRun;
  /**
   * The same query with hint({ $natural: 1 }) — a forced collection scan, i.e.
   * "what it costs without an index". Read-only; no index is dropped.
   */
  baseline: PlanRun;
  /** find: docs returned (≤ limit). count: the exact countDocuments value. */
  resultCount: number;
  /** count scenario only: estimatedDocumentCount() and its timing. */
  estimate: { count: number; measuredMs: number } | null;
  sample: SampleRow[];
  timingSamples: number;
  generatedAt: string;
}

export interface IndexInfo {
  name: string;
  keys: { field: string; direction: number | string }[];
}

export interface ManagedIndexStatus {
  id: ManagedIndexId;
  /** True if an index with this name or this exact key pattern exists. */
  present: boolean;
}

export interface IndexesResult {
  collection: string;
  indexes: IndexInfo[];
  managed: ManagedIndexStatus[];
  generatedAt: string;
}

export interface EnsureIndexResult extends IndexesResult {
  index: ManagedIndexId;
  /** False when it already existed (idempotent no-op). */
  created: boolean;
  buildMs: number | null;
}

/** Same envelope as the rest of the app (lib/businesses/api-helpers.ts). */
export type PerformanceApiError = BusinessApiError;
