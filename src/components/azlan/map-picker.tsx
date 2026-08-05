"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Azlan Dairy Restaurant coordinates (Malir, Karachi)
const RESTAURANT_LOCATION = {
  lat: 24.8934,
  lng: 67.2023,
};

// Custom marker icon
const customIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number };
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPicker({ onLocationSelect, initialLocation }: MapPickerProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    onLocationSelect(lat, lng);
  };

  const handleGetCurrentLocation = () => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handleLocationSelect(latitude, longitude);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsLoading(false);
          alert("Unable to get your location. Please allow location access or select your location on the map.");
        }
      );
    } else {
      setIsLoading(false);
      alert("Geolocation is not supported by your browser. Please select your location on the map.");
    }
  };

  return (
    <div className="space-y-3">
      {/* Important Delivery Instructions */}
      <div className="p-4 rounded-[var(--radius-xl)] bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-500 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wide text-amber-900 dark:text-amber-300">
          <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">warning</span>
          <span>Important Notice / اہم ہدایت</span>
        </div>
        <p className="text-xs font-bold text-amber-950 dark:text-amber-100 leading-relaxed">
          📍 This is very important: Please select your exact location on the map below. We will deliver your order directly to your exact location.
        </p>
        <p className="font-nastaliq text-base sm:text-lg leading-loose text-right font-extrabold pt-2 border-t border-amber-300/80 dark:border-amber-700/80 text-amber-950 dark:text-amber-100" dir="rtl">
          یہ بہت ضروری ہے! براہ کرم نیچے نقشے پر اپنی بالکل درست لوکیشن منتخب کریں۔ ہم آپ کا آرڈر آپ کے فراہم کردہ بالکل درست مقام پر پہنچائیں گے۔
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-on-surface)]">
          Select your delivery location on the map
        </p>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-semibold hover:bg-[var(--color-primary-container)] transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">
            {isLoading ? "progress_activity" : "my_location"}
          </span>
          {isLoading ? "Locating..." : "Use Current Location"}
        </button>
      </div>

      <div className="relative w-full h-64 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-outline-variant)]">
        <MapContainer
          center={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Restaurant marker */}
          <Marker
            position={[RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng]}
            icon={L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: #00230c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #a3d2a9; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          />

          {/* User selected location */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={customIcon} />
          )}

          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>

      {userLocation && (
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          Selected: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
