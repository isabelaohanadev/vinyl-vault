const STARS = [1, 2, 3, 4, 5];

// Read-only when no onChange is given. Clicking the current value clears the rating.
export const StarRating = ({ value = 0, onChange, label = 'Nota' }) => (
    <div className="rating-container" role={onChange ? 'group' : 'img'} aria-label={onChange ? label : `${label}: ${value} de 5`}>
        <div className="star-group">
            {STARS.map((star) =>
                onChange ? (
                    <button
                        key={star}
                        type="button"
                        className={`star-icon ${star <= value ? 'active' : ''}`}
                        onClick={() => onChange(star === value ? 0 : star)}
                        aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                        aria-pressed={star <= value}
                    >
                        <i className="fas fa-star" aria-hidden="true"></i>
                    </button>
                ) : (
                    <span key={star} className={`star-icon ${star <= value ? 'active' : ''}`} style={{ cursor: 'default' }}>
                        <i className="fas fa-star" aria-hidden="true"></i>
                    </span>
                )
            )}
        </div>
    </div>
);
