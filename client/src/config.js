// ---------------------------------------------------------------------------
// CityPal configuration — the main things a hotel would tweak.
// ---------------------------------------------------------------------------

export const APP_NAME = "CityPal";
export const APP_TAGLINE = "Your Limassol pocket guide";

// The app is locked to ONE city. The guest's GPS is used only when they are
// actually inside `radiusMeters` of `center`; otherwise (GPS denied, GPS error,
// or a phone that thinks it's in another city) the app snaps to the city centre.
// This guarantees every listing is in Limassol.
export const CITY = {
  name: "Limassol",
  // Pefkos City Hotel — Misiaouli & Kavazoglou 70, Agios Ioannis, Limassol.
  center: { lat: 34.67446, lng: 33.02578 },
  radiusMeters: 12000, // still counts a guest as "in Limassol" anywhere in the city
};

// How far around the guest to search for places, in metres.
export const SEARCH_RADIUS = 2500;

// Optional: a Google Maps Embed API key enables the richer in-app map view
// (multiple pins + Google photos/reviews on tap). Leave "" to use the free
// keyless embed instead. Get a key at https://console.cloud.google.com/
// (enable "Maps Embed API"). The Embed API has no usage charge.
export const GOOGLE_MAPS_EMBED_KEY = "";

// The category tiles on the home screen. `query` is the text sent to
// Foursquare; `mapQuery` is what the Google Maps view searches for.
export const CATEGORIES = [
  { id: "food", label: "Eat", emoji: "🍽️", query: "restaurant", mapQuery: "restaurants" },
  { id: "coffee", label: "Coffee", emoji: "☕", query: "coffee", mapQuery: "coffee shops" },
  { id: "bars", label: "Drinks", emoji: "🍸", query: "bar", mapQuery: "bars" },
  { id: "sights", label: "Sights", emoji: "📸", query: "tourist attraction", mapQuery: "tourist attractions" },
  { id: "museums", label: "Museums", emoji: "🏛️", query: "museum", mapQuery: "museums" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", query: "shopping", mapQuery: "shopping" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊", query: "pharmacy", mapQuery: "pharmacy" },
  { id: "atm", label: "ATM", emoji: "🏧", query: "atm", mapQuery: "atm" },
  { id: "transport", label: "Transport", emoji: "🚇", query: "metro station", mapQuery: "public transport" },
  { id: "taxi", label: "Taxi", emoji: "🚕", query: "taxi", mapQuery: "taxi stand" },
];
