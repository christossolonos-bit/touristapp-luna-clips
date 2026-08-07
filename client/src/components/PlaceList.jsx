import { useState } from "react";
import PlaceCard from "./PlaceCard";
import { mapEmbedUrl } from "../maps";

/**
 * Results for one category: a list of image cards plus a toggle to an in-app
 * Google Map showing the same category as pins around the guest.
 */
export default function PlaceList({ category, coords, places, loading, error, onOpen, onSpeak, onDirections }) {
  const [view, setView] = useState("list"); // "list" | "map"

  return (
    <section className="place-list">
      <div className="view-toggle">
        <button
          className={view === "list" ? "active" : ""}
          onClick={() => setView("list")}
        >
          List
        </button>
        <button
          className={view === "map" ? "active" : ""}
          onClick={() => setView("map")}
        >
          Map
        </button>
      </div>

      {view === "map" ? (
        !coords ? (
          <p className="hint">Finding your location…</p>
        ) : (
          <div className="map-wrap">
            <iframe
              title={`${category.label} near you`}
              src={mapEmbedUrl({
                lat: coords.lat,
                lng: coords.lng,
                query: category.mapQuery,
              })}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )
      ) : loading ? (
        <p className="hint">Finding the best {category.label.toLowerCase()} near you…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : places.length === 0 ? (
        <p className="hint">Nothing found nearby. Try the Map view or widen your search.</p>
      ) : (
        <ul className="cards">
          {places.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              onOpen={onOpen}
              onSpeak={onSpeak}
              onDirections={onDirections}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
