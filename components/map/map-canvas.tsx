"use client";

import * as React from "react";

import { RatingStars } from "@/components/businesses/rating-stars";
import { featuresToPaths, outlineBounds } from "@/lib/map/geo";
import { cn, formatFull } from "@/lib/utils";
import type { GeoBounds, MapPoint } from "@/lib/map/types";

/**
 * A dependency-free geographic map.
 *
 * We deliberately avoid an external maps/tiles library (per project scope). Real
 * lat/lng are projected into an SVG viewport with an equirectangular projection
 * plus a cos(lat) correction, and we draw LOCAL (bundled) US + Canada state
 * outlines through the SAME projector so the dots land on the right states.
 * No tiles, no API key, no outbound request — the dataset stays fully local.
 *
 * Projection frame: the data's bounding box, padded, but never smaller than a
 * minimum span (so a tight cluster still shows surrounding context) and clamped
 * to sensible North America limits. State outlines outside the frame simply
 * fall off-canvas (clipped), which is fine.
 */

const VIEW_W = 1000;
const VIEW_H = 620;
const PAD = 30;
const FRAME_PAD = 0.12; // 12% padding around the data bounds
const MIN_SPAN_DEG = 2.5; // never zoom tighter than ~2.5° so there's context

const STATUS_COLOR: Record<MapPoint["status"], string> = {
  open: "hsl(var(--brand-mint))",
  closed: "hsl(var(--brand-coral))",
  unknown: "hsl(var(--muted-foreground))",
};

interface Projected extends MapPoint {
  x: number;
  y: number;
  r: number;
}

interface Projection {
  toX: (lng: number) => number;
  toY: (lat: number) => number;
  plate: { x: number; y: number; w: number; h: number };
}

/** Build an equirectangular projector for a given lat/lng frame. */
function buildProjection(frame: GeoBounds): Projection {
  const latSpan = Math.max(frame.maxLat - frame.minLat, 0.02);
  const lngSpan = Math.max(frame.maxLng - frame.minLng, 0.02);
  const midLatRad = ((frame.minLat + frame.maxLat) / 2) * (Math.PI / 180);
  const lngScale = Math.cos(midLatRad);

  const innerW = VIEW_W - PAD * 2;
  const innerH = VIEW_H - PAD * 2;
  const scale = Math.min(innerW / (lngSpan * lngScale), innerH / latSpan);

  const drawnW = lngSpan * lngScale * scale;
  const drawnH = latSpan * scale;
  const offsetX = PAD + (innerW - drawnW) / 2;
  const offsetY = PAD + (innerH - drawnH) / 2;

  return {
    toX: (lng) => offsetX + (lng - frame.minLng) * lngScale * scale,
    toY: (lat) => offsetY + (frame.maxLat - lat) * scale,
    plate: { x: offsetX, y: offsetY, w: drawnW, h: drawnH },
  };
}

/** Derive the projection frame from the data bounds (padded + min span). */
function deriveFrame(bounds: GeoBounds): GeoBounds {
  let { minLat, maxLat, minLng, maxLng } = bounds;

  const latPad = (maxLat - minLat) * FRAME_PAD;
  const lngPad = (maxLng - minLng) * FRAME_PAD;
  minLat -= latPad;
  maxLat += latPad;
  minLng -= lngPad;
  maxLng += lngPad;

  // Enforce a minimum span so a tight cluster keeps surrounding context.
  const latSpan = maxLat - minLat;
  if (latSpan < MIN_SPAN_DEG) {
    const mid = (minLat + maxLat) / 2;
    minLat = mid - MIN_SPAN_DEG / 2;
    maxLat = mid + MIN_SPAN_DEG / 2;
  }
  const lngSpan = maxLng - minLng;
  if (lngSpan < MIN_SPAN_DEG) {
    const mid = (minLng + maxLng) / 2;
    minLng = mid - MIN_SPAN_DEG / 2;
    maxLng = mid + MIN_SPAN_DEG / 2;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function projectPoints(points: MapPoint[], proj: Projection): Projected[] {
  const maxReviews = Math.max(1, ...points.map((p) => p.reviewCount));
  return points.map((p) => ({
    ...p,
    x: proj.toX(p.longitude),
    y: proj.toY(p.latitude),
    r: 2.5 + Math.sqrt(p.reviewCount / maxReviews) * 4.5,
  }));
}

export function MapCanvas({
  points,
  bounds,
}: {
  points: MapPoint[];
  bounds: GeoBounds;
}) {
  const [hover, setHover] = React.useState<Projected | null>(null);

  const frame = React.useMemo(() => deriveFrame(bounds), [bounds]);
  const proj = React.useMemo(() => buildProjection(frame), [frame]);
  const projected = React.useMemo(
    () => projectPoints(points, proj),
    [points, proj],
  );

  // State/province outline paths, projected into the same frame.
  const paths = React.useMemo(() => featuresToPaths(proj), [proj]);

  // A clip rect so outlines never spill past the drawing area.
  const clipId = React.useId().replace(/:/g, "");

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius)] border border-border">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Map of ${points.length} businesses over US and Canada state outlines`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={VIEW_W} height={VIEW_H} />
          </clipPath>
        </defs>

        {/* Ocean / backdrop */}
        <rect
          x={0}
          y={0}
          width={VIEW_W}
          height={VIEW_H}
          fill="hsl(var(--map-ocean))"
        />

        {/* State / province landmasses (clipped to the viewport) */}
        <g clipPath={`url(#${clipId})`}>
          {paths.map((p) => (
            <path
              key={p.name}
              d={p.d}
              fill="hsl(var(--map-land))"
              stroke="hsl(var(--map-border))"
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          ))}

          {/* Business markers */}
          {projected.map((p) => (
            <circle
              key={p.businessId}
              cx={p.x}
              cy={p.y}
              r={hover?.businessId === p.businessId ? p.r + 2 : p.r}
              fill={STATUS_COLOR[p.status]}
              fillOpacity={
                hover && hover.businessId !== p.businessId ? 0.45 : 0.9
              }
              stroke="hsl(var(--map-ocean))"
              strokeWidth={0.8}
              className="cursor-pointer transition-[r,fill-opacity]"
              onMouseEnter={() => setHover(p)}
            >
              <title>{`${p.name} — ${p.city}`}</title>
            </circle>
          ))}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hover ? (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 shadow-md"
          style={{
            left: `${(hover.x / VIEW_W) * 100}%`,
            top: `${(hover.y / VIEW_H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
        >
          <p className="truncate text-sm font-semibold text-popover-foreground">
            {hover.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{hover.city}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <RatingStars value={hover.stars} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatFull(hover.reviewCount)} rev.
            </span>
          </div>
        </div>
      ) : null}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card/85 px-3 py-1.5 text-xs backdrop-blur">
        {(
          [
            ["open", "Open"],
            ["closed", "Closed"],
            ["unknown", "Unknown"],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[key] }}
            />
            <span className="text-muted-foreground">{label}</span>
          </span>
        ))}
        <span className="text-muted-foreground">· marker size = reviews</span>
      </div>
    </div>
  );
}
