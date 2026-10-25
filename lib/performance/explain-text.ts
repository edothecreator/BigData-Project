import type { PerformanceResult } from "@/lib/performance/types";
import { formatFull } from "@/lib/utils";

/**
 * Plain-language reading of a scenario result. Pure and client-safe: it only
 * interprets the normalized numbers the API already returned.
 */

export type ExplanationTone = "good" | "bad" | "mixed";

export interface PlanExplanation {
  tone: ExplanationTone;
  headline: string;
  points: string[];
}

export function explainResult(
  result: PerformanceResult,
  expectedIndex: string | null,
  expectedIndexPresent: boolean | null,
): PlanExplanation {
  const { planner, baseline } = result;
  const p = planner.metrics;
  const b = baseline.metrics;
  const points: string[] = [];

  const speedup =
    planner.measuredMs > 0 ? baseline.measuredMs / planner.measuredMs : null;
  const compare =
    `Forced collection scan for comparison: examined ${formatFull(b.totalDocsExamined)} documents in ${baseline.measuredMs} ms` +
    (speedup && speedup >= 1.5 && planner.plan.usedIndex
      ? ` — about ${speedup.toFixed(speedup >= 10 ? 0 : 1)}× slower than the indexed plan.`
      : ".");

  // --- Count scenario -----------------------------------------------------
  if (result.kind === "count") {
    if (planner.plan.usedIndex) {
      points.push(
        `MongoDB answered by counting ${formatFull(p.totalKeysExamined)} entries in the ${planner.plan.indexName ?? "index"} index (${planner.plan.scanStage}) and read ${formatFull(p.totalDocsExamined)} documents.`,
        compare,
      );
    } else {
      points.push(
        `No index could serve the filter, so MongoDB read ${formatFull(p.totalDocsExamined)} documents to count ${formatFull(result.resultCount)} matches.`,
      );
    }
    if (result.estimate) {
      points.push(
        `estimatedDocumentCount() returned ${formatFull(result.estimate.count)} in ${result.estimate.measuredMs} ms by reading collection metadata — no scan at all, but it can only count the whole collection, never a filter.`,
      );
    }
    return {
      tone: planner.plan.usedIndex ? "good" : "bad",
      headline: planner.plan.usedIndex
        ? "Good plan: counted from the index without touching documents."
        : "Costly plan: every document was read to produce a count.",
      points,
    };
  }

  // --- Find scenarios ---------------------------------------------------
  const ratio =
    p.nReturned > 0 ? p.totalDocsExamined / p.nReturned : p.totalDocsExamined;

  if (planner.plan.usedIndex) {
    points.push(
      `The ${planner.plan.indexName ?? "chosen"} index took MongoDB straight to qualifying entries: ${formatFull(p.totalKeysExamined)} keys and ${formatFull(p.totalDocsExamined)} documents examined to return ${formatFull(p.nReturned)}.`,
    );
    if (planner.plan.inMemorySort) {
      points.push(
        "The results were still sorted in memory (SORT stage) — an index whose key order matches the sort would remove that step.",
      );
    } else if (result.querySummary.includes(".sort(")) {
      points.push(
        "The index already stores entries in the requested order, so MongoDB read the first 25 and stopped — no in-memory SORT.",
      );
    }
    points.push(compare);
    if (!baseline.plan.inMemorySort && b.totalDocsExamined < 1_000) {
      points.push(
        "With LIMIT 25 and a common value, even a collection scan can stop early. Try a rarer state (e.g. VT or SD) to see the scan cost grow.",
      );
    }
    return {
      tone: ratio <= 1.5 && !planner.plan.inMemorySort ? "good" : "mixed",
      headline:
        ratio <= 1.5 && !planner.plan.inMemorySort
          ? "Good plan: an index scan examined about as many documents as it returned."
          : "Index used, but some extra work remained.",
      points,
    };
  }

  // Collection scan.
  points.push(
    `MongoDB read ${formatFull(p.totalDocsExamined)} documents one by one to return ${formatFull(p.nReturned)} (${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)} examined per result) and used no index keys.`,
  );
  if (expectedIndex === null) {
    points.push(
      "A btree index is ordered by the start of each value, so it can't seek to a substring that could appear anywhere — and case-insensitive matching rules out even prefix seeks. An unanchored /…/i regex is always a scan.",
      "Index-friendly alternatives: an anchored, case-sensitive prefix (/^Coffee/) over an index on name, or a text / search index (different matching semantics).",
    );
    if (p.nReturned >= 25) {
      points.push(
        "The scan stopped as soon as it had 25 matches; a rarer search term makes it read much more of the collection.",
      );
    }
  } else if (expectedIndexPresent === false) {
    points.push(
      `The helpful index (${expectedIndex}) doesn't exist yet. Create it from the indexes panel and re-run to watch COLLSCAN turn into IXSCAN.`,
    );
  } else {
    points.push(
      `The planner preferred a scan even though ${expectedIndex} exists — usually because the filter isn't selective enough.`,
    );
  }

  return {
    tone: "bad",
    headline: "Costly plan: a collection scan examined far more documents than it returned.",
    points,
  };
}
