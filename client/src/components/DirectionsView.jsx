import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoute } from "../api";
import { directionsUrl } from "../maps";

// Emoji div-icons avoid Leaflet's default marker-image bundling issues.
const youIcon = L.divIcon({ className: "map-pin", html: "🔵", iconSize: [22, 22], iconAnchor: [11, 11] });
const destIcon = L.divIcon({ className: "map-pin", html: "📍", iconSize: [30, 30], iconAnchor: [15, 30] });

const fmtDist = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);
const fmtDur = (s) => {
  const min = Math.round(s / 60);
  return min < 1 ? "under a minute" : `${min} min`;
};

/**
 * Full-screen in-app walking directions: an OpenStreetMap map with the route,
 * a live "you are here" dot that follows the guest, and turn-by-turn steps.
 * Never leaves the app (with an optional Google Maps handoff button).
 */
export default function DirectionsView({ place, origin, onClose }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const youMarker = useRef(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch the walking route.
  useEffect(() => {
    if (!place || !origin) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRoute(null);
    fetchRoute({ from: origin, to: { lat: place.lat, lng: place.lng } })
      .then((r) => active && setRoute(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [place, origin]);

  // 2. Draw the map once the route is available.
  useEffect(() => {
    if (!route || !mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const line = L.polyline(route.path, { color: "#14b8a6", weight: 5, opacity: 0.9 }).addTo(map);
    L.marker([place.lat, place.lng], { icon: destIcon }).addTo(map);
    youMarker.current = L.marker([origin.lat, origin.lng], { icon: youIcon }).addTo(map);

    // The sheet slides up; size the map after the transition settles.
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }, 220);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [route, place, origin]);

  // 3. Follow the guest live as they walk.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        youMarker.current?.setLatLng([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const recenter = () => {
    if (mapRef.current && youMarker.current) {
      mapRef.current.setView(youMarker.current.getLatLng(), 17);
    }
  };

  return (
    <div className="directions">
      <header className="dir-header">
        <button className="dir-close" onClick={onClose} aria-label="Close">
          ‹
        </button>
        <div className="dir-title">
          <strong>{place?.name}</strong>
          <span>
            {route ? `${fmtDist(route.distance)} · ${fmtDur(route.duration)} walk` : "Walking route"}
          </span>
        </div>
        <button className="dir-recenter" onClick={recenter} title="Recenter on me">
          🔵
        </button>
      </header>

      <div className="dir-map" ref={mapEl}>
        {loading && <div className="dir-overlay">Building your route…</div>}
        {error && <div className="dir-overlay error">{error}</div>}
      </div>

      {route && (
        <div className="dir-steps">
          <ol>
            {route.steps.map((s, i) => (
              <li key={i}>
                <span className="step-text">{s.text}</span>
                {s.distance > 0 && <span className="step-dist">{fmtDist(s.distance)}</span>}
              </li>
            ))}
          </ol>
          <a className="btn dir-external" href={directionsUrl(place)} target="_blank" rel="noreferrer">
            Open in Google Maps instead
          </a>
        </div>
      )}
    </div>
  );
}
