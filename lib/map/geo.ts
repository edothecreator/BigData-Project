import rawGeo from "@/lib/map/na-states.geo.json";

/**
 * Local US + Canada state/province outlines (Natural Earth 50m admin-1, public
 * domain), trimmed to name + geometry and rounded to ~1km precision. Bundled in
 * the repo so the map draws real boundaries with NO external tile server, NO
 * API key, and NO outbound network request — the dataset stays fully local.
 *
 * Source: Natural Earth via github.com/martynafford/natural-earth-geojson
 * (public domain). Content was reduced/reprojected for this project.
 */

type Ring = [number, number][];

interface GeoFeature {
  type: "Feature";
  properties: { name: string; postal: string; country: "US" | "CA" };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] };
}

interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

export const naStates = rawGeo as unknown as GeoCollection;

/** A single polygon ring already projected to SVG coordinates. */
export type ProjectedRing = { x: number; y: number }[];

/** Projector: longitude/latitude -> SVG x/y. */
export interface LngLatProjector {
  toX: (lng: number) => number;
  toY: (lat: number) => number;
}

/**
 * Convert the GeoJSON features into SVG path "d" strings using the supplied
 * projector. Each feature can be multiple rings (islands, archipelagos), joined
 * into one path with sub-paths so holes/islands render correctly.
 */
export function featuresToPaths(proj: LngLatProjector): {
  name: string;
  d: string;
}[] {
  const out: { name: string; d: string }[] = [];

  for (const f of naStates.features) {
    const polygons: Ring[][] =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;

    let d = "";
    for (const rings of polygons) {
      for (const ring of rings) {
        if (ring.length === 0) continue;
        ring.forEach(([lng, lat], i) => {
          const x = proj.toX(lng).toFixed(1);
          const y = proj.toY(lat).toFixed(1);
          d += `${i === 0 ? "M" : "L"}${x} ${y}`;
          if (i < ring.length - 1) d += " ";
        });
        d += "Z";
      }
    }
    if (d) out.push({ name: f.properties.name, d });
  }

  return out;
}

/** Overall bounding box of all outline coordinates (US + Canada). */
export function outlineBounds(): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;

  const scan = (ring: Ring) => {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  };

  for (const f of naStates.features) {
    if (f.geometry.type === "Polygon") f.geometry.coordinates.forEach(scan);
    else f.geometry.coordinates.forEach((p) => p.forEach(scan));
  }

  return { minLat, maxLat, minLng, maxLng };
}
