import { useCallback, useEffect, useState } from "react";
import { CITY } from "../config";

/** Metres between two lat/lng points (haversine). */
function distance(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Returns the location to search around, LOCKED to the configured city.
 * - If GPS puts the guest inside the city, use their real position (so nearby
 *   results are truly nearby).
 * - If GPS is denied, errors, or lands outside the city, snap to the city centre.
 * `status` is "locating" | "gps" (real, in-city) | "city" (snapped to centre).
 */
export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("locating");

  const locate = useCallback(() => {
    setStatus("locating");

    const useCity = () => {
      setCoords(CITY.center);
      setStatus("city");
    };

    if (!("geolocation" in navigator)) return useCity();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (distance(here, CITY.center) <= CITY.radiusMeters) {
          setCoords(here);
          setStatus("gps");
        } else {
          useCity(); // guest is outside Limassol — keep them in the city
        }
      },
      () => useCity(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { coords, status, retry: locate };
}
