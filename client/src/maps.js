import { GOOGLE_MAPS_EMBED_KEY } from "./config";

/**
 * URL for the in-app Google Maps <iframe>.
 * - With an Embed API key: official "search" mode → multiple pins + tappable
 *   Google photos/reviews for a whole category near the guest.
 * - Without a key: the free keyless embed, centred on the guest.
 */
export function mapEmbedUrl({ lat, lng, query }) {
  if (GOOGLE_MAPS_EMBED_KEY) {
    const q = encodeURIComponent(`${query} near ${lat},${lng}`);
    return (
      `https://www.google.com/maps/embed/v1/search` +
      `?key=${GOOGLE_MAPS_EMBED_KEY}&q=${q}&zoom=15`
    );
  }
  const q = encodeURIComponent(query || "");
  return `https://maps.google.com/maps?q=${q}&ll=${lat},${lng}&z=15&output=embed`;
}

/** Embed centred on a single place (used in the place detail sheet). */
export function placeEmbedUrl({ lat, lng, name }) {
  if (GOOGLE_MAPS_EMBED_KEY) {
    const q = encodeURIComponent(name ? `${name}` : `${lat},${lng}`);
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_KEY}&q=${q}&center=${lat},${lng}&zoom=17`;
  }
  return `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
}

/** Deep link that opens turn-by-turn directions in the Google Maps app. */
export function directionsUrl({ lat, lng }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Deep link that opens the place in Google Maps (name search near coords). */
export function viewOnMapsUrl({ lat, lng, name }) {
  const query = encodeURIComponent(name ? `${name} ${lat},${lng}` : `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
