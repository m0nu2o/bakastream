export default function MediaCardSkeleton() {
  return (
    <article className="media-card" aria-hidden="true">
      <div className="media-card__frame skeleton" />
      <div className="media-card__body">
        <div
          className="skeleton"
          style={{ height: '2.7rem', marginBottom: '0.25rem', width: '90%', borderRadius: '4px' }}
        />
        <div className="skeleton" style={{ height: '1.35rem', width: '55%', borderRadius: '4px' }} />
      </div>
    </article>
  );
}
