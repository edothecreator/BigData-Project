import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartEmptyState } from "@/components/dashboard/chart-card";
import type { MarketMetrics } from "@/lib/insights/types";
import { formatFull, formatPercent } from "@/lib/utils";

export function MarketTable({ rows, label }: { rows: (MarketMetrics & { label: string })[]; label: string }) {
  if (!rows.length) return <ChartEmptyState message="No matching businesses found." />;
  return (
    <Table aria-label={label}>
      <TableHeader><TableRow>
        <TableHead>{label}</TableHead><TableHead className="text-right">Businesses</TableHead>
        <TableHead className="text-right">Avg rating</TableHead><TableHead className="text-right">Open rate</TableHead>
      </TableRow></TableHeader>
      <TableBody>{rows.map((row) => (
        <TableRow key={row.label}>
          <TableCell className="min-w-[120px] max-w-[240px] font-medium"><span className="block truncate" title={row.label}>{row.label}</span></TableCell>
          <TableCell className="text-right tabular-nums">{formatFull(row.count)}</TableCell>
          <TableCell className="text-right tabular-nums">{row.averageRating === null ? "—" : `${row.averageRating.toFixed(2)} / 5`}</TableCell>
          <TableCell className="text-right tabular-nums">{row.openRatio === null ? "Unknown" : formatPercent(row.openRatio)}</TableCell>
        </TableRow>
      ))}</TableBody>
    </Table>
  );
}
