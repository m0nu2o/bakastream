import { NextResponse } from 'next/server';
import { isTMDBConfigured } from '@/lib/tmdb/server';
import { getConfiguredProviders } from '@/lib/providers';

export const dynamic = 'force-dynamic';

/** Deployment smoke-test endpoint: reports service configuration (no secrets). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    tmdbConfigured: isTMDBConfigured(),
    streamProviders: getConfiguredProviders().map(p => p.id),
    time: new Date().toISOString(),
  });
}
