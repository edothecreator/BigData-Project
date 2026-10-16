/**
 * Browser-facing types for the Map Explorer.
 *
 * The map plots real business coordinates. To stay performant we never ship all
 * 150K points: the API returns a bounded, filtered set (e.g. the top-N by review
 * volume for a selected state), plus aggregate bounds and counts.
 */

export interface MapPoint {
  businessId: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  stars: number | null;
  reviewCount: number;
  status: "open" | "closed" | "unknown";
}

/** Geographic bounding box of the returned points. */
export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapResult {
  points: MapPoint[];
  bounds: GeoBounds | null;
  /** Total businesses with coordinates matching the filter (before the limit). */
  totalMatching: number;
  /** How many points were actually returned (the cap). */
  returned: number;
  /** The cap applied. */
  limit: number;
  /** Distinct states available for the filter control. */
  states: string[];
  /** The state filter in effect (empty = all). */
  state: string;
  generatedAt: string;
}

export interface MapApiError {
  error: true;
  code: "VALIDATION_FAILED" | "DB_UNREACHABLE" | "QUERY_FAILED";
  message: string;
  issues?: { path: string; message: string }[];
}
