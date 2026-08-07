# CityPal — pocket city guide (PWA)

A tourist guide web app a hotel can hand out via QR code. Guests scan → the app
opens in Android Chrome → they can browse nearby restaurants, sights, museums,
coffee, transport and taxis, sorted by distance, with an in-app map, directions
and **text-to-speech**. Installable to the home screen (PWA).

**No API keys required.** Everything is keyless and OpenStreetMap-based:
- category tiles → **Overpass API**
- free-text search → **Nominatim**
- **in-app walking directions** → **OSRM** routing on a **Leaflet + OSM-tiles** map
  (turn-by-turn steps + a live "you are here" dot; never leaves the app)
- the category "Map" preview → Google's keyless map embed (for photos/reviews)

## Architecture

```
client/  Vite + React PWA        (what the guest sees; TTS + UI + Google map embed)
server/  Express API proxy       (queries OpenStreetMap, normalises the results)
```

The client calls only our own `/api/places`; the server talks to OpenStreetMap.
This keeps upstream calls (and rate-limit etiquette) on the server side.

## Prerequisites

- Node.js 18+ (uses the built-in `fetch`)
- That's it — no keys, no accounts.

## Setup

```bash
# 1. Backend
cd server
npm install
npm run dev                 # starts on http://localhost:8787

# 2. Frontend (second terminal)
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend.

## Set the hotel / default city

Edit `client/src/config.js` → `DEFAULT_LOCATION` (lat/lng of the hotel). This is
the fallback used when the guest denies GPS permission.

## Production (single deploy)

```bash
cd client && npm run build      # outputs client/dist
cd ../server && npm start       # serves the built PWA + the API on one port
```

Point the hotel QR code at the deployed URL. That's it.

## Text-to-speech notes

- Tap **🔊 Listen** on any place to hear its name, category and distance read
  aloud, via the Web Speech API (`speechSynthesis`).
- Works in **Android Chrome** (the target). No microphone permission is needed —
  there's no voice input, just spoken output.

## Scaling note (OpenStreetMap etiquette)

The public Overpass, Nominatim, OSRM and OpenStreetMap tile endpoints are free
but rate-limited and meant for light use. For a busy hotel deployment you'd cache
results or run your own instances (or switch to a paid provider). Fine for a
single hotel / demo as-is.

**Walking-directions accuracy:** the free OSRM demo server routes on a car graph
and returns car-speed times, so the app derives a realistic walking ETA from the
distance instead. Routes still follow real streets but may not use pedestrian-only
paths. For true pedestrian routing, point `OSRM_URL` in `server/index.js` at a
Valhalla `pedestrian` instance (e.g. the keyless FOSSGIS one) or a keyed provider.
