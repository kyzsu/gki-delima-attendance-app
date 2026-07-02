import * as React from "react";
import { GeoMap } from "@/components/geo-map";
import { CHURCH, GEOFENCE_RADIUS_M } from "@/app/store";
import type { Coords } from "@/lib/api";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/** Mapbox Static Images has no native circle, so approximate the geofence as a
 *  GeoJSON polygon (simplestyle spec for stroke/fill). */
function ringFeature(lat: number, lng: number, radiusM: number, color: string) {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const ring: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    ring.push([
      +(lng + (radiusM * Math.cos(a)) / mPerDegLng).toFixed(6),
      +(lat + (radiusM * Math.sin(a)) / mPerDegLat).toFixed(6),
    ]);
  }
  return {
    type: "Feature" as const,
    properties: { stroke: color, "stroke-width": 2, fill: color, "fill-opacity": 0.14 },
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}

function hasCoords(u: Coords | null | undefined): u is { lat: number; lng: number } {
  return !!u && typeof u.lat === "number" && typeof u.lng === "number";
}

/**
 * Real geofence map (Mapbox Static Images API): the church anchor + the 50 m
 * ring, plus the user's live position when it is known. Falls back to the
 * stylized GeoMap when no token is configured or the image fails to load, so
 * the flow always renders something.
 */
export function GeoFenceMap({
  inRange,
  danger,
  user,
  height = 230,
}: {
  inRange: boolean;
  danger?: boolean;
  user?: Coords | null;
  height?: number;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);

  // The stylized fallback keeps the current look when there is no live map.
  const fallback = (
    <GeoMap
      inRange={inRange}
      danger={danger}
      height={height}
      userPos={inRange ? { x: "56%", y: "46%" } : { x: "85%", y: "18%" }}
    />
  );
  if (!TOKEN || imgFailed) return fallback;

  const ringColor = inRange ? "#c13ad6" : danger ? "#e0556e" : "#8a7790";
  const ring = `geojson(${encodeURIComponent(
    JSON.stringify(ringFeature(CHURCH.lat, CHURCH.lng, GEOFENCE_RADIUS_M, ringColor)),
  )})`;
  const overlays = [ring, `pin-l+c13ad6(${CHURCH.lng},${CHURCH.lat})`];
  if (hasCoords(user)) {
    overlays.push(`pin-s+${inRange ? "2d1b33" : "e0556e"}(${user.lng},${user.lat})`);
  }
  // `auto` frames every overlay (ring + pins); padding keeps pins off the edge.
  const w = 640;
  const h = Math.round((w * height) / 430);
  const url =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
    `${overlays.join(",")}/auto/${w}x${h}@2x?padding=48&access_token=${TOKEN}`;

  return (
    <div className="relative rounded-[22px] overflow-hidden border border-line" style={{ height }}>
      <img
        src={url}
        alt={`Peta ${CHURCH.name} dan posisi Anda`}
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover"
        draggable={false}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[10px] text-[10.5px] font-bold bg-white px-2 py-[2px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
        style={{ color: ringColor }}
      >
        radius {GEOFENCE_RADIUS_M} m
      </div>
    </div>
  );
}
