import "server-only";

import type { Document } from "mongodb";

import { getDb } from "@/lib/mongodb";
import type { MapQuery } from "@/lib/map/schema";
import type { GeoBounds, MapPoint, MapResult } from "@/lib/map/types";

const BUSINESSES = "businesses";

function toStatus(isOpen: unknown): MapPoint["status"] {
  if (isOpen === 1) return "open";
  if (isOpen === 0) return "closed";
  return "unknown";
}

interface RawPoint {
  business_id: string;
  name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  review_count?: number;
  is_open?: number;
}

/** Build the shared geo filter (points must have numeric coordinates). */
function buildFilter(query: MapQuery): Document {
  const filter: Document = {
    latitude: { $type: "number" },
    longitude: { $type: "number" },
  };
  if (query.state) filter.state = query.state;
  if (query.status === "open") filter.is_open = 1;
  else if (query.status === "closed") filter.is_open = 0;
  if (query.minRating > 0) filter.stars = { $gte: query.minRating };
  return filter;
}

/**
 * Return a bounded set of map points plus aggregate metadata.
 *
 * We never return all matching businesses — only the top-N by review volume
 * (the most recognizable), which keeps the payload and the SVG render bounded.
 * The exact match count and the bounding box are computed server-side so the UI
 * can honestly show "showing N of M".
 */
export async function getMapData(query: MapQuery): Promise<MapResult> {
  const db = await getDb();
  const coll = db.collection(BUSINESSES);
  const filter = buildFilter(query);

  const pointsPromise = coll
    .aggregate<RawPoint>(
      [
        { $match: filter },
        // Most-reviewed first so the capped set is the most meaningful.
        { $sort: { review_count: -1, business_id: 1 } },
        { $limit: query.limit },
        {
          $project: {
            _id: 0,
            business_id: 1,
            name: 1,
            city: 1,
            latitude: 1,
            longitude: 1,
            stars: 1,
            review_count: 1,
            is_open: 1,
          },
        },
      ],
      { allowDiskUse: true },
    )
    .toArray();

  const totalPromise = coll.countDocuments(filter);

  // Distinct states (small — 27 values) for the filter control.
  const statesPromise = coll.distinct("state", {
    state: { $type: "string", $ne: "" },
  }) as Promise<string[]>;

  const [rawPoints, totalMatching, states] = await Promise.all([
    pointsPromise,
    totalPromise,
    statesPromise,
  ]);

  const points: MapPoint[] = rawPoints
    .filter(
      (p) =>
        typeof p.latitude === "number" && typeof p.longitude === "number",
    )
    .map((p) => ({
      businessId: p.business_id,
      name: p.name ?? "(unnamed business)",
      city: p.city ?? "",
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      stars: typeof p.stars === "number" ? p.stars : null,
      reviewCount: typeof p.review_count === "number" ? p.review_count : 0,
      status: toStatus(p.is_open),
    }));

  // Bounding box from the returned points (for the projection viewport).
  let bounds: GeoBounds | null = null;
  if (points.length > 0) {
    bounds = points.reduce<GeoBounds>(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.latitude),
        maxLat: Math.max(acc.maxLat, p.latitude),
        minLng: Math.min(acc.minLng, p.longitude),
        maxLng: Math.max(acc.maxLng, p.longitude),
      }),
      {
        minLat: points[0]!.latitude,
        maxLat: points[0]!.latitude,
        minLng: points[0]!.longitude,
        maxLng: points[0]!.longitude,
      },
    );
  }

  return {
    points,
    bounds,
    totalMatching,
    returned: points.length,
    limit: query.limit,
    states: states.filter(Boolean).sort((a, b) => a.localeCompare(b)),
    state: query.state ?? "",
    generatedAt: new Date().toISOString(),
  };
}
