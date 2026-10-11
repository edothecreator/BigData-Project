"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RatingStars } from "@/components/businesses/rating-stars";
import { StatusBadge } from "@/components/businesses/status-badge";
import { PAGE_SIZES } from "@/lib/businesses/schema";
import type {
  BusinessListItem,
  BusinessListResult,
  BusinessSortField,
  SortDirection,
} from "@/lib/businesses/types";
import { cn, formatFull } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  field: BusinessSortField;
  activeSort: BusinessSortField;
  direction: SortDirection;
  onSort: (field: BusinessSortField) => void;
  className?: string;
  numeric?: boolean;
}

function SortableHeader({
  label,
  field,
  activeSort,
  direction,
  onSort,
  className,
  numeric,
}: SortableHeaderProps) {
  const active = activeSort === field;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          numeric && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-50")} />
      </button>
    </TableHead>
  );
}

function CategoriesCell({ categories }: { categories: string[] }) {
  if (categories.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const shown = categories.slice(0, 2);
  const extra = categories.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <Badge key={c} variant="secondary" className="max-w-[10rem] truncate">
          {c}
        </Badge>
      ))}
      {extra > 0 ? <Badge variant="muted">+{extra}</Badge> : null}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-[8rem]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function ResultsTable({
  data,
  isLoading,
  isFetching,
  onSort,
  onPage,
  onPageSize,
  onOpenDetail,
}: {
  data: BusinessListResult | null;
  isLoading: boolean;
  isFetching: boolean;
  onSort: (field: BusinessSortField) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onOpenDetail: (item: BusinessListItem) => void;
}) {
  const pageSize = data?.pageSize ?? 25;
  const page = data?.page ?? 1;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const sort = data?.sort ?? "review_count";
  const direction = data?.direction ?? "desc";

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const showEmpty = !isLoading && data && data.items.length === 0;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <div
        className={cn(
          "transition-opacity",
          isFetching && !isLoading && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHeader
                label="Business"
                field="name"
                activeSort={sort}
                direction={direction}
                onSort={onSort}
              />
              <SortableHeader
                label="Location"
                field="city"
                activeSort={sort}
                direction={direction}
                onSort={onSort}
              />
              <TableHead>Categories</TableHead>
              <SortableHeader
                label="Rating"
                field="stars"
                activeSort={sort}
                direction={direction}
                onSort={onSort}
              />
              <SortableHeader
                label="Reviews"
                field="review_count"
                activeSort={sort}
                direction={direction}
                onSort={onSort}
                numeric
                className="text-right"
              />
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          {isLoading ? (
            <TableSkeleton rows={pageSize > 10 ? 10 : pageSize} />
          ) : showEmpty ? (
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-2 py-14 text-center">
                    <SearchX className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No businesses found</p>
                    <p className="text-xs text-muted-foreground">
                      Try broadening your search or clearing some filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            <TableBody>
              {data?.items.map((item) => (
                <TableRow key={item.businessId}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item)}
                      className="text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {item.name}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {[item.city, item.state].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <CategoriesCell categories={item.categories} />
                  </TableCell>
                  <TableCell>
                    <RatingStars value={item.stars} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFull(item.reviewCount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDetail(item)}
                      aria-label={`View details for ${item.name}`}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span aria-live="polite">
            {total === 0
              ? "No results"
              : `${formatFull(rangeStart)}–${formatFull(rangeEnd)} of ${formatFull(total)}`}
          </span>
          <span className="flex items-center gap-1.5">
            <span>Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSize(Number(v))}
            >
              <SelectTrigger className="h-7 w-[4.5rem]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Page {formatFull(page)} of {formatFull(totalPages)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages || isLoading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
