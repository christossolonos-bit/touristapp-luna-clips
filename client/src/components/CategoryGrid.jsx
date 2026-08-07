import { CATEGORIES } from "../config";

export default function CategoryGrid({ onPick }) {
  return (
    <div className="category-grid">
      {CATEGORIES.map((c) => (
        <button key={c.id} className="category-tile" onClick={() => onPick(c)}>
          <span className="category-emoji" aria-hidden="true">
            {c.emoji}
          </span>
          <span className="category-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
