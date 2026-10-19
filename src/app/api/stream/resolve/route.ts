/**
 * Stream resolution endpoint.
 *
 * The player posts "what to play" here; the server asks the configured
 * provider(s) and returns playback info (or an honest 'unavailable'). Provider
 * credentials and upstream calls stay server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveStream } from '@/lib/providers';
import type { MediaType } from '@/types';

const VALID_TYPES: MediaType[] = ['movie', 'tv'];

export async function POST(request: NextRequest) {
  let body: {
    type?: string;
    id?: number;
    imdbId?: string;
    season?: number;
    episode?: number;
    title?: string;
    isAnime?: boolean;
    subOrDub?: 'sub' | 'dub';
    server?: string;
    language?: string;
    resumeAt?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type as MediaType | undefined;
  const id = Number(body.id);

  if (!type || !VALID_TYPES.includes(type) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: 'A valid `type` ("movie" | "tv") and numeric `id` are required.' },
      { status: 400 }
    );
  }

  try {
    const info = await resolveStream({
      type,
      id,
      imdbId: typeof body.imdbId === 'string' && body.imdbId.trim() ? body.imdbId.trim() : undefined,
      season: Number.isInteger(body.season) ? body.season : undefined,
      episode: Number.isInteger(body.episode) ? body.episode : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      isAnime: Boolean(body.isAnime),
      subOrDub: body.subOrDub === 'dub' ? 'dub' : 'sub',
      server: typeof body.server === 'string' ? body.server : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      resumeAt: typeof body.resumeAt === 'number' ? body.resumeAt : undefined,
    });

    return NextResponse.json(info, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (err) {
    console.warn('[Stream Resolve Route] Resolution error:', err);
    return NextResponse.json(
      {
        providerId: 'fallback',
        providerLabel: 'Fallback',
        status: 'unavailable',
        playback: null,
        audioTracks: [],
        subtitles: [],
        message: 'Stream provider temporarily unavailable. Please try another server.',
        notice: '',
      },
      { headers: { 'cache-control': 'no-store' } }
    );
  }
}
