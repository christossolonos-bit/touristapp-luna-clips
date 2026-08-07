// Thin wrapper around our own backend. The browser talks only to /api; the
// server fetches from OpenStreetMap's Overpass API (keyless).

export async function fetchPlaces({ lat, lng, category, q, radius, signal }) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (radius) params.set("radius", String(radius));

  const res = await fetch(`/api/places?${params.toString()}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data.places ?? [];
}

// Walking directions (path + turn-by-turn steps) from our server (OSRM).
export async function fetchRoute({ from, to, signal }) {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });
  const res = await fetch(`/api/route?${params.toString()}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}
