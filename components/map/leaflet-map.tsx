"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import { useTheme } from "next-themes";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./map-cluster.css";

import { ClusterLayer } from "@/components/map/cluster-layer";
import type { MapPoint } from "@/lib/map/types";

/**
 * The actual Leaflet map. Rendered client-only (loaded via next/dynamic with
 * ssr:false by the parent) because Leaflet touches `window`.
 *
 * Basemap tiles come from CARTO (light/dark variants matching the app theme).
 * NOTE: tiles are the ONLY external request in the whole app — the Yelp
 * business data itself stays entirely local in MongoDB and is never sent out.
 */

// Esri "Canvas" basemaps — free, NO API key required, and intentionally
// minimal (clean gray canvas) which suits an analytics map. Light/dark variants
// follow the app theme. (CARTO's basemaps now require a key, so we don't use
// them.)
const ESRI_ATTR =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const TILES = {
  light: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTR,
  },
  dark: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTR,
  },
} as const;

export default function LeafletMap({ points }: { points: MapPoint[] }) {
  const { resolvedTheme } = useTheme();
  const tiles = resolvedTheme === "dark" ? TILES.dark : TILES.light;

  return (
    <MapContainer
      center={[39.5, -98.35]} // geographic center of the US as a sensible default
      zoom={4}
      scrollWheelZoom
      className="h-[560px] w-full"
      style={{ background: "hsl(var(--map-ocean))" }}
    >
      <TileLayer
        key={resolvedTheme}
        url={tiles.url}
        attribution={tiles.attribution}
        maxZoom={16}
      />
      <ClusterLayer points={points} />
    </MapContainer>
  );
}
