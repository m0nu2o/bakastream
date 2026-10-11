# BakaStream

A polished, high-performance streaming-website interface for discovering **movies**, **TV shows / web series** and **anime** — built with Next.js 16 (App Router), React 19, and TypeScript.

BakaStream is a **website application** featuring decoupled metadata and playback layers:

```
Browser (Client UI)
   │
   ▼
Next.js 16 (Server Layer)
   │
   ├── TMDB API  ───► Metadata (Server-held credentials, cached responses)
   │
   └── /api/stream/resolve
         │
         ▼
     Provider Registry (NovaAPI adapter / Demo Preview fallback)
         │
         ▼
     Playback Resolution (Native HLS / MP4 direct streams or iframe embed)
         │
         ▼
     Custom Video Player (hls.js with audio/subtitle/quality selection)
```

> **Legal notice:** BakaStream does not host, store, or distribute any media. All metadata is retrieved from [TMDB](https://www.themoviedb.org/). Stream playback is resolved through a pluggable provider registry. No DRM is bypassed and no paywalls or authentication controls are circumvented.

---

## Features

- **Cinematic Homepage** — Dynamic hero banner carousel with backdrop art, horizontal scrolling rails for Trending, Popular Movies, Popular TV Series, Top Rated Movies, Recently Added, Top Rated TV Series, Anime, and categorized genre spotlights.
- **Rich Movie Pages (`/movie/[slug]`)** — Backdrop hero, high-res posters, tagline, release year, runtime, ratings, genre tags, storyline overview, top cast rail, YouTube trailer embed, watch provider availability (Netflix, Prime, etc.), and similar titles.
- **TV Series & Web Series (`/tv/[slug]`)** — Full season tabs with an interactive episode browser displaying episode thumbnails, titles, air dates, and overview summaries.
- **Dedicated Watch Experience (`/watch/...`)** — Direct movie playback and season/episode TV playback with persistent watch progress, next/previous episode navigation, and automatic resume.
- **Custom HTML5 / HLS Player** — Powered by `hls.js`:
  - Adaptive bitrate quality selection (Auto, 1080p, 720p, 480p, etc.)
  - Embedded audio tracks and provider stream switching (Hindi, English, Tamil, Telugu, etc. when available)
  - Subtitle track selector (WebVTT sidecar and embedded HLS captions)
  - Playback speed adjustment (0.5× to 2×)
  - Picture-in-Picture (PiP) and Fullscreen modes
  - Volume slider and audio mute toggle
  - Keyboard shortcuts (`Space`/`k` to play/pause, `Left`/`Right` to seek 5s, `j`/`l` to seek 30s, `c` for subtitles, `f` for fullscreen, `m` for mute, `0`–`9` percentage seek, `,`/`.` for speed)
  - Browser autoplay policy resilience and graceful loading/error indicators
- **Search & Discovery (`/search`)** — Real-time debounced search, filtering by media type (Movies/TV), genre, and release year with pagination.
- **Local Watchlist & Continue Watching (`/watchlist`)** — Client-side storage via `localStorage` with resume timestamps and progress bars. Zero account or database requirement.
- **Social Connect** — Official Instagram integration in footer: [@itxz_baka](https://www.instagram.com/itxz_baka/).
- **Responsive & Accessible** — Full dark cinematic theme with light theme support, mobile drawer navigation, responsive grid layouts, and semantic HTML.
- **Server-Side Security** — TMDB API credentials and stream provider queries are strictly isolated on the server; client bundles receive zero secrets.

---

## Prerequisites

- **Node.js**: v20.x, v22.x, or v24.x
- **Package Manager**: `pnpm` v10+ (recommended) or `npm` v10+
- **TMDB API Credentials**: TMDB v3 API Key or v4 Read Access Token (free at [themoviedb.org](https://www.themoviedb.org/settings/api))

---

## Installation & Setup

1. **Extract or clone the project:**
   ```bash
   cd bakastream
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and insert your credentials:
   ```env
   # Enter your TMDB credential (at least one is required):
   TMDB_API_KEY=your_tmdb_api_key_here
   # OR
   TMDB_ACCESS_TOKEN=your_v4_access_token_here

   # Optional: NovaAPI provider URL (defaults to canonical instance)
   NOVA_API_URL=https://8streamapi.vercel.app
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build and run for production:**
   ```bash
   pnpm build
   pnpm start
   ```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `TMDB_API_KEY` | Yes (or token) | TMDB v3 API key. Used server-side only. |
| `TMDB_ACCESS_TOKEN` | Yes (or key) | TMDB v4 Read Access Token (Bearer header). |
| `TMDB_BASE_URL` | No | Base URL for TMDB API (defaults to `https://api.themoviedb.org/3`). |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical site URL for metadata, Open Graph, and sitemap (e.g. `https://bakastream.vercel.app`). |
| `NOVA_API_URL` | No | Base URL of an active NovaAPI instance. When omitted, the built-in legal preview player is used. |
| `NEXT_PUBLIC_GA_TRACKING_ID` | No | Google Analytics 4 Measurement ID (analytics disabled when empty). |
| `PORT` | No | Server listen port for production (default: `3000`). |
| `HOSTNAME` | No | Server bind address for production (default: `0.0.0.0`). |

---

## How the Provider Adapter Works

BakaStream defines a clean TypeScript abstraction in `src/lib/providers`:

1. **Resolve Request**: The client requests playback via `POST /api/stream/resolve` with `{ type, id, season?, episode?, language? }`.
2. **Provider Evaluation**:
   - `NovaProvider`: Active if `NOVA_API_URL` is set. Queries `/api/v1/mediaInfo` (including `season` and `episode` for TV series) and `/api/v1/getStream`. Automatically categorizes output into native HLS (`.m3u8`), native MP4, or third-party embed iframes.
   - `DemoPreviewProvider`: Default fallback providing open-source sample HLS test streams (Mux test assets).
3. **Response Normalization**: All providers return typed `PlaybackInfo`:
   - `playback`: `{ kind: 'native', url, streamType }` or `{ kind: 'embed', embedUrl }`
   - `audioTracks`: Array of real available language tracks
   - `subtitles`: Array of available WebVTT or caption tracks
   - `status`: `'ok'` or `'unavailable'` with an honest explanation when content or audio language is not found.

---

## Known Provider Limitations

- **NovaAPI**:
  - Requires an active, reachable server instance. A GitHub repository URL is not an API endpoint.
  - Requires valid IMDb IDs (`tt...`) resolved via TMDB external IDs.
  - Multi-language availability depends on the upstream files returned by the specific provider instance; Hindi or regional audio is only available when present in the provider's playlist response.
- **Legal Preview Player**:
  - Serves public test media (Big Buck Bunny test stream) to verify all player controls and HLS functionality without infringing copyrighted media.

---

## Deployment Guidance

### Vercel Deployment
1. Connect the GitHub repository in the Vercel dashboard.
2. In Project Settings > Environment Variables, add `TMDB_API_KEY` (or `TMDB_ACCESS_TOKEN`).
3. Deploy. The Next.js App Router edge and node runtimes are automatically supported.

### Docker Deployment
The project includes a multi-stage `Dockerfile` creating a lightweight standalone container:
```bash
docker build -t bakastream .
docker run -p 3000:3000 -e TMDB_API_KEY=your_key bakastream
```

---

## Troubleshooting

- **TMDB 401 Unauthorized / Blank Catalog**:
  Ensure `.env.local` exists in the project root and contains a valid `TMDB_API_KEY` or `TMDB_ACCESS_TOKEN`. Restart the server after editing environment files.
- **Audio Language Unavailable**:
  Language selectors only show tracks genuinely returned by the provider. If Hindi audio is not present for a title, the player displays an honest unavailable message.
- **Browser Autoplay Blocked**:
  Modern browsers block unmuted autoplay without prior user interaction. BakaStream catches autoplay rejections and displays the large center play button so the user can begin playback with one click.
- **Port In Use (EADDRINUSE: 3000)**:
  Run on an alternate port: `pnpm dev -- -p 3005` or `pnpm start -- -p 3005`.
- **Health Check**:
  Visit `http://localhost:3000/api/health` to verify that TMDB and stream providers are configured.

---

## Available Scripts

- `pnpm dev` — Start Next.js development server with Turbopack.
- `pnpm build` — Build production application.
- `pnpm start` — Start production server.
- `pnpm lint` — Run ESLint check with zero warnings allowed.
- `pnpm typecheck` — Run TypeScript type checking (`tsc --noEmit`).
- `pnpm format` — Format source code with Prettier.
- `pnpm format:check` — Verify source formatting.

---

## License

[MIT](LICENSE)
