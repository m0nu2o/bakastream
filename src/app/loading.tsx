import './loading.css';

export default function Loading() {
  return (
    <div className="cinema-loading" role="status" aria-label="Loading BakaStream">
      <div className="cinema-loading__ambient" aria-hidden="true" />
      <div className="cinema-loading__content">
        <div className="cinema-loading__emblem-wrap">
          <div className="cinema-loading__ring cinema-loading__ring--outer" aria-hidden="true" />
          <div className="cinema-loading__ring" aria-hidden="true" />
          <div className="cinema-loading__emblem">
            <img
              src="/favicon.png"
              alt="BakaStream"
              width={32}
              height={32}
              className="cinema-loading__logo-img"
            />
          </div>
        </div>

        <div className="cinema-loading__brand">
          <div className="cinema-loading__title">
            <span>
              Baka<span className="cinema-loading__title-accent">Stream</span>
            </span>
            <span className="cinema-loading__dot" aria-hidden="true" />
          </div>
          <span className="cinema-loading__caption">Loading cinema experience</span>
        </div>

        <div className="cinema-loading__progress" aria-hidden="true">
          <div className="cinema-loading__bar" />
        </div>
      </div>
    </div>
  );
}
