import { NextRequest, NextResponse } from 'next/server';
import { discoverLanguages } from '@/lib/languages';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const origLang = searchParams.get('origLang') ?? undefined;

    const result = discoverLanguages({
      originalLanguage: origLang,
    });

    return NextResponse.json({
      id,
      hasHindiAudio: result.hasHindiAudio,
      hasHindiDub: result.hasHindiDub,
      summaryLabel: result.summaryLabel,
      audioTracks: result.audioLanguages,
      subtitleTracks: result.subtitleLanguages,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
