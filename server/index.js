import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { PORT = 8787 } = process.env;

const USER_AGENT = "CityPal/1.0 (tourist guide demo)";

// Public Overpass endpoints (no key required). Tried in order.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_URL = "https://router.project-osrm.org/route/v1/foot"; // keyless walking routing

// Map each home-screen category id -> the OpenStreetMap tags that represent it.
// A pair ["k", "v"] matches tag k=v; ["k", "*"] matches any node with key k.
const CATEGORY_FILTERS = {
  food: [["amenity", "restaurant"], ["amenity", "fast_food"]],
  coffee: [["amenity", "cafe"]],
  bars: [["amenity", "bar"], ["amenity", "pub"]],
  sights: [["tourism", "attraction"], ["tourism", "viewpoint"], ["historic", "*"]],
  museums: [["tourism", "museum"], ["tourism", "gallery"]],
  shopping: [["shop", "mall"], ["shop", "department_store"], ["amenity", "marketplace"]],
  pharmacy: [["amenity", "pharmacy"]],
  atm: [["amenity", "atm"], ["amenity", "bank"]],
  transport: [
    ["railway", "station"],
    ["amenity", "bus_station"],
    ["public_transport", "station"],
  ],
  taxi: [["amenity", "taxi"]],
};

const app = express();
app.use(cors());

// --- Small helpers ---------------------------------------------------------

/** fetch that aborts after `ms` so a slow upstream can never hang a request. */
async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function haversine(a, b) {
  const R = 6371000; // metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function titleCase(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Sort by distance, then drop duplicates that share a name + distance. */
function tidy(places) {
  const seen = new Set();
  return places
    .filter((p) => p.name && p.lat != null)
    .sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
    .filter((p) => {
      const key = `${p.name}@${p.distance}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// --- Category browsing via Overpass (fast, tag-indexed) --------------------

function categoryQuery(filters, lat, lng, radius, limit) {
  const around = `(around:${radius},${lat},${lng})`;
  const parts = filters.flatMap(([k, v]) => {
    const sel = v === "*" ? `["${k}"]` : `["${k}"="${v}"]`;
    return [`node${sel}${around};`, `way${sel}${around};`];
  });
  return `[out:json][timeout:25];(${parts.join("")});out center ${limit};`;
}

async function runOverpass(query) {
  let lastErr;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const data = await res.json();
      return data.elements ?? [];
    } catch (err) {
      lastErr = err; // try the next mirror
    }
  }
  throw lastErr ?? new Error("All Overpass endpoints failed");
}

function normaliseOverpass(el, origin) {
  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;
  const t = el.tags ?? {};
  return {
    id: `${el.type}/${el.id}`,
    name: t.name || t["name:en"] || null,
    lat,
    lng,
    distance: lat != null && lng != null ? haversine(origin, { lat, lng }) : null,
    address:
      [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") ||
      t["addr:city"] ||
      "",
    category: titleCase(
      t.amenity || t.tourism || t.shop || t.railway || t.historic || ""
    ),
    rating: null,
    price: null,
    openNow: null,
    hoursDisplay: t.opening_hours || null,
    tel: t.phone || t["contact:phone"] || null,
    website: t.website || t["contact:website"] || null,
    photo: t.image || null,
  };
}

// --- Free-text search via Nominatim (purpose-built for names) --------------

async function nominatimSearch(text, origin, radius, limit) {
  const d = radius / 111000; // rough metres -> degrees
  const viewbox = [origin.lng - d, origin.lat + d, origin.lng + d, origin.lat - d].join(",");
  const params = new URLSearchParams({
    format: "jsonv2",
    q: text,
    limit: String(limit),
    viewbox,
    bounded: "1",
    addressdetails: "1",
    namedetails: "1",
    extratags: "1",
  });

  const res = await fetchWithTimeout(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = await res.json();
  return arr.map((item) => normaliseNominatim(item, origin));
}

function normaliseNominatim(item, origin) {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  const a = item.address ?? {};
  const x = item.extratags ?? {};
  return {
    id: `${item.osm_type}/${item.osm_id}`,
    name: item.namedetails?.name || item.name || item.display_name?.split(",")[0] || null,
    lat,
    lng,
    distance: haversine(origin, { lat, lng }),
    address:
      [a.road, a.house_number].filter(Boolean).join(" ") || a.suburb || a.city || "",
    category: titleCase(item.type || item.class || ""),
    rating: null,
    price: null,
    openNow: null,
    hoursDisplay: x.opening_hours || null,
    tel: x.phone || x["contact:phone"] || null,
    website: x.website || x["contact:website"] || null,
    photo: x.image || null,
  };
}

// --- Walking directions via OSRM (keyless) ---------------------------------

/** Turn an OSRM step into a short human instruction. */
function stepInstruction(step) {
  const m = step.maneuver ?? {};
  const mod = m.modifier ? ` ${m.modifier}` : "";
  const onto = step.name ? ` onto ${step.name}` : "";
  const on = step.name ? ` on ${step.name}` : "";
  switch (m.type) {
    case "depart":
      return `Head${m.modifier ? ` ${m.modifier}` : ""}${on}`;
    case "arrive":
      return "Arrive at your destination";
    case "turn":
    case "end of road":
      return `Turn${mod}${onto}`;
    case "continue":
      return `Continue${mod}${on}`;
    case "new name":
      return `Continue${on}`;
    case "fork":
      return `Keep${mod}${onto}`;
    case "roundabout":
    case "rotary":
      return `Take the roundabout${onto}`;
    case "merge":
      return `Merge${mod}${onto}`;
    default:
      return `${m.type ?? "Continue"}${mod}${on}`.trim();
  }
}

async function getRoute(from, to) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson&steps=true`;
  const res = await fetchWithTimeout(url, {
    headers: { "User-Agent": USER_AGENT, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`OSRM: ${data.code ?? "no route"}`);
  }
  const route = data.routes[0];
  // The public OSRM demo returns car-speed durations even for the foot profile,
  // so derive a realistic walking time from the distance (~4.9 km/h) instead.
  const WALK_MPS = 1.35;
  return {
    distance: Math.round(route.distance), // metres
    duration: Math.round(route.distance / WALK_MPS), // seconds, walking estimate
    // GeoJSON is [lng,lat]; Leaflet wants [lat,lng].
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    steps: (route.legs?.[0]?.steps ?? []).map((s) => ({
      text: stepInstruction(s),
      distance: Math.round(s.distance),
      name: s.name || "",
    })),
  };
}

// --- Routes ----------------------------------------------------------------

app.get("/api/health", (_req, res) => res.json({ ok: true, provider: "overpass+nominatim+osrm" }));

app.get("/api/route", async (req, res) => {
  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) {
    return res.status(400).json({ error: "fromLat, fromLng, toLat, toLng are required" });
  }
  try {
    const route = await getRoute(
      { lat: Number(fromLat), lng: Number(fromLng) },
      { lat: Number(toLat), lng: Number(toLng) }
    );
    res.json(route);
  } catch (err) {
    console.error("[/api/route]", err.message);
    res.status(502).json({ error: "Could not build walking directions. Try again." });
  }
});

app.get("/api/places", async (req, res) => {
  const { lat, lng, category, q = "", radius = "2500", limit = "40" } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const origin = { lat: Number(lat), lng: Number(lng) };
  const r = clamp(Number(radius), 100, 20000);
  const lim = clamp(Number(limit), 1, 60);

  try {
    let places;
    if (category && CATEGORY_FILTERS[category]) {
      const elements = await runOverpass(categoryQuery(CATEGORY_FILTERS[category], lat, lng, r, lim));
      places = elements.map((el) => normaliseOverpass(el, origin));
    } else if (q.trim()) {
      places = await nominatimSearch(q.trim(), origin, r, lim);
    } else {
      return res.status(400).json({ error: "Provide a known category or a search query." });
    }
    res.json({ places: tidy(places) });
  } catch (err) {
    console.error("[/api/places]", err.message);
    const msg =
      err.name === "AbortError"
        ? "The map data service took too long. Please try again."
        : "Could not reach the map data service. Try again.";
    res.status(502).json({ error: msg });
  }
});

// --- Serve the built PWA in production -------------------------------------

const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Not built yet. Run `npm run build` in client/.");
  });
});

app.listen(PORT, () => {
  console.log(`CityPal API (Overpass + Nominatim, keyless) listening on http://localhost:${PORT}`);
});
