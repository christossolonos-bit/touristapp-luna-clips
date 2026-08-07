function formatDistance(m) {
  if (m == null) return null;
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function priceSymbols(price) {
  if (!price) return null;
  return "€".repeat(price);
}

export default function PlaceCard({ place, onOpen, onSpeak, onDirections }) {
  const distance = formatDistance(place.distance);

  return (
    <li className="place-card" onClick={() => onOpen(place)}>
      <div className="place-thumb">
        {place.photo ? (
          <img src={place.photo} alt="" loading="lazy" />
        ) : (
          <div className="place-thumb--empty">📍</div>
        )}
      </div>

      <div className="place-body">
        <div className="place-title-row">
          <h3>{place.name}</h3>
          {place.rating != null && (
            <span className="rating" title="Rating out of 10">
              ★ {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="place-meta">
          {place.category}
          {distance && <> · {distance}</>}
          {priceSymbols(place.price) && <> · {priceSymbols(place.price)}</>}
        </p>

        <p className="place-open">
          {place.openNow === true && <span className="open">● Open now</span>}
          {place.openNow === false && <span className="closed">● Closed</span>}
          {place.address && <span className="addr"> {place.address}</span>}
        </p>

        <div className="place-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn--primary" onClick={() => onDirections(place)}>
            Directions
          </button>
          <button className="btn" onClick={() => onSpeak(place)} aria-label="Read aloud">
            🔊 Listen
          </button>
        </div>
      </div>
    </li>
  );
}
