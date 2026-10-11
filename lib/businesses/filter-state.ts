import {
  MIN_RATINGS,
  PAGE_SIZES,
  SORT_FIELDS,
  STATUS_VALUES,
} from "@/lib/businesses/schema";
import type {
  BusinessSortField,
  SortDirection,
} from "@/lib/businesses/types";

/**
 * Client-side representation of the Explorer's filter/sort/page state. Kept in
 * one place so the hook, the URL serializer, and the components agree.
 */
export interface ExplorerState {
  search: string;
  city: string;
  state: string;
  category: string;
  minRating: (typeof MIN_RATINGS)[number];
  status: (typeof STATUS_VALUES)[number];
  page: number;
  pageSize: (typeof PAGE_SIZES)[number];
  sort: BusinessSortField;
  direction: SortDirection;
}

export const DEFAULT_STATE: ExplorerState = {
  search: "",
  city: "",
  state: "",
  category: "",
  minRating: 0,
  status: "any",
  page: 1,
  pageSize: 25,
  sort: "review_count",
  direction: "desc",
};

function isOneOf<T extends readonly unknown[]>(
  arr: T,
  v: unknown,
): v is T[number] {
  return (arr as readonly unknown[]).includes(v);
}

/** Parse URL search params into a fully-defaulted ExplorerState. */
export function stateFromParams(params: URLSearchParams): ExplorerState {
  const num = (key: string, fallback: number) => {
    const n = Number(params.get(key));
    return Number.isFinite(n) ? n : fallback;
  };

  const minRatingRaw = num("minRating", DEFAULT_STATE.minRating);
  const pageSizeRaw = num("pageSize", DEFAULT_STATE.pageSize);
  const sortRaw = params.get("sort");
  const dirRaw = params.get("direction");
  const statusRaw = params.get("status");

  return {
    search: params.get("search") ?? "",
    city: params.get("city") ?? "",
    state: params.get("state") ?? "",
    category: params.get("category") ?? "",
    minRating: isOneOf(MIN_RATINGS, minRatingRaw)
      ? minRatingRaw
      : DEFAULT_STATE.minRating,
    status: isOneOf(STATUS_VALUES, statusRaw)
      ? statusRaw
      : DEFAULT_STATE.status,
    page: Math.max(1, Math.trunc(num("page", DEFAULT_STATE.page))),
    pageSize: isOneOf(PAGE_SIZES, pageSizeRaw)
      ? pageSizeRaw
      : DEFAULT_STATE.pageSize,
    sort: isOneOf(SORT_FIELDS, sortRaw) ? sortRaw : DEFAULT_STATE.sort,
    direction: dirRaw === "asc" ? "asc" : DEFAULT_STATE.direction,
  };
}

/** Serialize state into URL params, omitting values equal to defaults. */
export function paramsFromState(state: ExplorerState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.city) params.set("city", state.city);
  if (state.state) params.set("state", state.state);
  if (state.category) params.set("category", state.category);
  if (state.minRating !== DEFAULT_STATE.minRating)
    params.set("minRating", String(state.minRating));
  if (state.status !== DEFAULT_STATE.status) params.set("status", state.status);
  if (state.page !== DEFAULT_STATE.page) params.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_STATE.pageSize)
    params.set("pageSize", String(state.pageSize));
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_STATE.direction)
    params.set("direction", state.direction);
  return params;
}

/** Build the API query string from state, using the debounced search term. */
export function apiQueryFromState(
  state: ExplorerState,
  debouncedSearch: string,
): string {
  const params = new URLSearchParams();
  const search = debouncedSearch.trim();
  if (search) params.set("search", search);
  if (state.city) params.set("city", state.city);
  if (state.state) params.set("state", state.state);
  if (state.category) params.set("category", state.category);
  params.set("minRating", String(state.minRating));
  params.set("status", state.status);
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  params.set("sort", state.sort);
  params.set("direction", state.direction);
  return params.toString();
}
