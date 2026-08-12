"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Azlan Fast Food and B B Q point coordinates (Malir, Karachi)
const RESTAURANT_LOCATION = {
  lat: 24.9080912,
  lng: 67.2124054,
};

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

// Create the marker icon lazily (only in the browser)
let _customIcon: L.Icon | null = null;
function getCustomIcon() {
  if (!_customIcon) {
    _customIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
  return _customIcon;
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
            <Marker position={[userLocation.lat, userLocation.lng]} icon={getCustomIcon()} />
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
