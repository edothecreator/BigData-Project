"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

import type { MapPoint } from "@/lib/map/types";

/**
 * Imperative marker-cluster layer.
 *
 * leaflet.markercluster is a classic (non-React) Leaflet plugin, so we drive it
 * imperatively against the map instance from react-leaflet's useMap(). Markers
 * are small colored circles (by open/closed status) with a popup; dense areas
 * collapse into count bubbles that expand on click/zoom.
 */

const STATUS_COLOR: Record<MapPoint["status"], string> = {
  open: "#20C997", // mint
  closed: "#FF7A59", // coral
  unknown: "#778097", // secondary text
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(p: MapPoint): string {
  const stars =
    p.stars === null ? "—" : `${p.stars.toFixed(1)}&#9733;`;
  const statusLabel =
    p.status === "open" ? "Open" : p.status === "closed" ? "Closed" : "Unknown";
  const loc = [p.city].filter(Boolean).map(escapeHtml).join(", ");
  return `
    <div style="min-width:160px">
      <div style="font-weight:600;font-size:13px;margin-bottom:2px">${escapeHtml(p.name)}</div>
      <div style="color:#778097;font-size:11px;margin-bottom:4px">${loc}</div>
      <div style="font-size:12px">${stars} · ${p.reviewCount.toLocaleString("en-US")} reviews</div>
      <div style="font-size:11px;color:${STATUS_COLOR[p.status]};margin-top:2px">${statusLabel}</div>
    </div>`;
}

export function ClusterLayer({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // (Re)create the cluster group whenever the point set changes.
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    for (const p of points) {
      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: 5,
        color: "#12182B",
        weight: 1,
        fillColor: STATUS_COLOR[p.status],
        fillOpacity: 0.9,
      });
      marker.bindPopup(popupHtml(p));
      group.addLayer(marker);
    }

    map.addLayer(group);
    groupRef.current = group;

    // Fit the view to the data (padded) so the markers are framed nicely.
    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map, points]);

  return null;
}
