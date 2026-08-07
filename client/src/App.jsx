import { useCallback, useEffect, useRef, useState } from "react";
import { APP_NAME, APP_TAGLINE, SEARCH_RADIUS, CITY } from "./config";
import { fetchPlaces } from "./api";
import { useGeolocation } from "./hooks/useGeolocation";
import { useSpeech } from "./hooks/useSpeech";
import CategoryGrid from "./components/CategoryGrid";
import PlaceList from "./components/PlaceList";
import PlaceDetail from "./components/PlaceDetail";
import DirectionsView from "./components/DirectionsView";

export default function App() {
  const { coords, status, retry } = useGeolocation();
  const { speak } = useSpeech();

  const [category, setCategory] = useState(null); // active category or free-text pseudo-category
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [directionsFor, setDirectionsFor] = useState(null);
  const [queryText, setQueryText] = useState("");

  const abortRef = useRef(null);

  // Open a category immediately. If location isn't ready yet, remember it and
  // the effect below runs the search as soon as coords arrive — so a tap is
  // never a dead no-op while "Locating…".
  const runSearch = useCallback((cat) => {
    setCategory(cat);
    setError(null);
    setPlaces([]);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!category || !coords) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    // A real category tile searches by its id; the free-text box searches by name.
    const isFreeText = category.id === "search";
    fetchPlaces({
      lat: coords.lat,
      lng: coords.lng,
      category: isFreeText ? undefined : category.id,
      q: isFreeText ? category.query : undefined,
      radius: SEARCH_RADIUS,
      signal: controller.signal,
    })
      .then((results) => setPlaces(results))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [category, coords]);

  const onPickCategory = (cat) => {
    setQueryText("");
    runSearch(cat);
  };

  const onTextSearch = (text) => {
    const t = text.trim();
    if (!t) return;
    // A free-text search behaves like a one-off category.
    runSearch({ id: "search", label: t, query: t, mapQuery: t });
  };

  // Read a place aloud with text-to-speech.
  const speakPlace = useCallback(
    (place) => {
      const bits = [place.name];
      if (place.category) bits.push(place.category);
      if (place.rating != null) bits.push(`rated ${place.rating.toFixed(1)} out of 10`);
      if (place.distance != null) {
        bits.push(
          place.distance < 1000
            ? `${place.distance} metres away`
            : `${(place.distance / 1000).toFixed(1)} kilometres away`
        );
      }
      if (place.openNow === true) bits.push("open now");
      if (place.openNow === false) bits.push("currently closed");
      speak(bits.join(", "));
    },
    [speak]
  );

  const goHome = () => {
    abortRef.current?.abort();
    setCategory(null);
    setPlaces([]);
    setError(null);
    setQueryText("");
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" onClick={goHome} role="button">
          <span className="brand-mark">📍</span>
          <div>
            <h1>{APP_NAME}</h1>
            <p>{APP_TAGLINE}</p>
          </div>
        </div>
        <LocationBadge status={status} onRetry={retry} />
      </header>

      <SearchBar value={queryText} onChange={setQueryText} onSubmit={onTextSearch} />

      <main className="app-main">
        {!category ? (
          <>
            <h2 className="section-title">What are you looking for?</h2>
            <CategoryGrid onPick={onPickCategory} />
          </>
        ) : (
          <>
            <div className="results-head">
              <button className="back" onClick={goHome}>
                ‹ Back
              </button>
              <h2 className="section-title">{category.label}</h2>
            </div>
            <PlaceList
              category={category}
              coords={coords}
              places={places}
              loading={loading}
              error={error}
              onOpen={setSelected}
              onSpeak={speakPlace}
              onDirections={setDirectionsFor}
            />
          </>
        )}
      </main>

      <PlaceDetail
        place={selected}
        onClose={() => setSelected(null)}
        onSpeak={speakPlace}
        onDirections={setDirectionsFor}
      />

      {directionsFor && coords && (
        <DirectionsView
          place={directionsFor}
          origin={coords}
          onClose={() => setDirectionsFor(null)}
        />
      )}
    </div>
  );
}

function LocationBadge({ status, onRetry }) {
  const label =
    status === "gps"
      ? `Near you · ${CITY.name}`
      : status === "locating"
      ? "Locating…"
      : CITY.name;
  return (
    <button className={`loc-badge loc-${status}`} onClick={onRetry} title="Update location">
      📡 {label}
    </button>
  );
}

function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        type="text"
        placeholder="Search, e.g. sushi, pharmacy, rooftop bar…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        enterKeyHint="search"
      />
      <button type="submit" className="search-go" aria-label="Search">
        🔍
      </button>
    </form>
  );
}
