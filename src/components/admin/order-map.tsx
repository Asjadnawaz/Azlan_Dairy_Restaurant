"use client";

import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
}

export default function OrderMap({ deliveryLat, deliveryLng }: OrderMapProps) {
  return (
    <div className="relative w-full h-40 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-outline-variant)]/50">
      <MapContainer
        center={[
          (RESTAURANT_LOCATION.lat + deliveryLat) / 2,
          (RESTAURANT_LOCATION.lng + deliveryLng) / 2,
        ]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={false}
        zoomControl={false}
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

        {/* Polyline for Route */}
        <Polyline
          positions={[
            [RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng],
            [deliveryLat, deliveryLng],
          ]}
          color="#00230c"
          weight={4}
          dashArray="8, 8"
          opacity={0.8}
        />
      </MapContainer>
    </div>
  );
}
