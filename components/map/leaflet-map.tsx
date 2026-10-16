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

// CARTO basemaps — free, no API key. Dark matches ReviewScope's navy palette.
const TILES = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
        maxZoom={19}
      />
      <ClusterLayer points={points} />
    </MapContainer>
  );
}
