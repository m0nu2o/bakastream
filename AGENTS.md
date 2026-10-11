> SkyStream is a single Next.js web app. Website only — no mobile/desktop app.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **pnpm** for dependencies
- Styling: plain CSS with CSS variables (dark cinematic theme), CSS modules for page-scoped styles
- Metadata: TMDB via a server-only service layer (`src/lib/tmdb/server.ts`)
- Playback: provider registry (`src/lib/providers`) — demo preview by default, Nova adapter gated by `NOVA_API_URL`
- Player: custom HTML5 player with hls.js (`src/components/player/VideoPlayer.tsx`)

## Rules

- TMDB keys are **server-only**: read via `process.env` in server components/route
  handlers. Never use `NEXT_PUBLIC_` for credentials.
- The browser fetches metadata exclusively through internal routes
  (`/api/tmdb/...`, `/api/search*`) and playback through `POST /api/stream/resolve`.
- Never hard-code provider URLs in components — add/adapt a `StreamProvider`.
- Providers must report only real tracks/qualities/subtitles; never invent them.
- Don't disable TypeScript checks or use build flags like `--force` to make
  things pass; fix the underlying issue.
- `pnpm lint` runs with `--max-warnings 0`; keep it that way.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
