"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";
import { fetchRouteGeometry } from "@/lib/delivery";

// Restaurant coordinates
const RESTAURANT_LOCATION = {
  lat: 24.9080912,
  lng: 67.2124054,
};

// Custom marker icon for customer
const customerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface OrderMapProps {
  deliveryLat: number;
  deliveryLng: number;
  onRouteCalculated?: (info: { distanceKm: number; durationMinutes: number }) => void;
}

/** Auto-fit the map to the route bounds */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [positions, map]);
  return null;
}

export default function OrderMap({ deliveryLat, deliveryLng, onRouteCalculated }: OrderMapProps) {
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      setLoading(true);
      const result = await fetchRouteGeometry(
        RESTAURANT_LOCATION.lat,
        RESTAURANT_LOCATION.lng,
        deliveryLat,
        deliveryLng
      );

      if (cancelled) return;

      if (result && result.geometry) {
        // Decode the OSRM polyline into [lat, lng] pairs
        const decoded: [number, number][] = polyline.decode(result.geometry);
        setRoutePositions(decoded);
        setRouteInfo({ distanceKm: result.distanceKm, durationMinutes: result.durationMinutes });
        onRouteCalculated?.({ distanceKm: result.distanceKm, durationMinutes: result.durationMinutes });
      } else {
        // Fallback: straight line
        setRoutePositions([
          [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
          [deliveryLat, deliveryLng],
        ]);
        setRouteInfo(null);
      }
      setLoading(false);
    }

    loadRoute();
    return () => { cancelled = true; };
  }, [deliveryLat, deliveryLng]);

  return (
    <div className="relative w-full h-40 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-outline-variant)]/50">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            Calculating route…
          </div>
        </div>
      )}
      <MapContainer
        center={[
          (RESTAURANT_LOCATION.lat + deliveryLat) / 2,
          (RESTAURANT_LOCATION.lng + deliveryLng) / 2,
        ]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Cleaner, lighter map style
        />

        {/* Restaurant Marker */}
        <Marker
          position={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
          icon={L.divIcon({
            className: "custom-div-icon",
            html: `<div style="background-color: #00230c; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #a3d2a9; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        />

        {/* Customer Marker */}
        <Marker position={[deliveryLat, deliveryLng]} icon={customerIcon} />

        {/* Real Road Route or Fallback Straight Line */}
        {routePositions.length >= 2 && (
          <>
            <Polyline
              positions={routePositions}
              color="#00230c"
              weight={4}
              opacity={0.9}
            />
            <FitBounds positions={routePositions} />
          </>
        )}
      </MapContainer>

      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md border border-slate-200/80 text-[10px] font-bold text-slate-700">
          <span className="text-emerald-700">{routeInfo.distanceKm.toFixed(1)} km</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">~{routeInfo.durationMinutes} min</span>
        </div>
      )}
    </div>
  );
}
