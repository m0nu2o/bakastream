export default function MediaCardSkeleton() {
  return (
    <article className="media-card" aria-hidden="true">
      <div className="media-card__poster-box skeleton" />
      <div className="media-card__info">
        <div
          className="skeleton"
          style={{ height: '14px', marginBottom: '8px', width: '85%', borderRadius: '4px' }}
        />
        <div
          className="skeleton"
          style={{ height: '12px', width: '50%', borderRadius: '4px' }}
        />
      </div>
    </article>
  );
}
