import { placeEmbedUrl, viewOnMapsUrl } from "../maps";

export default function PlaceDetail({ place, onClose, onSpeak, onDirections }) {
  if (!place) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="map-wrap sheet-map">
          <iframe
            title={place.name}
            src={placeEmbedUrl(place)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div className="sheet-body">
          <div className="place-title-row">
            <h2>{place.name}</h2>
            {place.rating != null && <span className="rating">★ {place.rating.toFixed(1)}</span>}
          </div>
          <p className="place-meta">{place.category}</p>
          {place.address && <p className="addr">{place.address}</p>}
          {place.hoursDisplay && <p className="hours">🕒 {place.hoursDisplay}</p>}

          <div className="sheet-actions">
            <button
              className="btn btn--primary"
              onClick={() => {
                onClose();
                onDirections(place);
              }}
            >
              Directions
            </button>
            <a className="btn" href={viewOnMapsUrl(place)} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
            {place.tel && (
              <a className="btn" href={`tel:${place.tel}`}>
                📞 Call
              </a>
            )}
            {place.website && (
              <a className="btn" href={place.website} target="_blank" rel="noreferrer">
                🌐 Website
              </a>
            )}
            <button className="btn" onClick={() => onSpeak(place)}>
              🔊 Listen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
