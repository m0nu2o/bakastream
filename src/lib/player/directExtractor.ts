/**
 * Ultra-fast client-side direct HLS/MP4 stream & WebVTT subtitle extractor.
 * Fetches CORS-enabled APIs straight from the browser (0 worker bandwidth, ~200ms load,
 * 0 third-party iframe bloat, 0 ads) and feeds streams directly into <VideoPlayer>.
 */

import type { SubtitleTrack } from '@/lib/providers/types';

export interface DirectStreamOption {
  id: string;
  label: string;
  language: string;
  url: string;
  streamType: 'hls' | 'mp4';
}

export interface DirectExtractionResult {
  streams: DirectStreamOption[];
  subtitles: SubtitleTrack[];
}

const VR_HEX_KEY = '7f3e9c2a8b5d1f4e6a9c3b7d2e5f8a1c4b6d9e2f5a8c1b4d7e9f2a5c8b1d4e7f';

let cachedCryptoKey: Promise<CryptoKey> | null = null;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function base64UrlToBytes(b64u: string): Uint8Array {
  let b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const mod = b64.length % 4;
  if (mod === 2) b64 += '==';
  else if (mod === 3) b64 += '=';
  else if (mod === 1) throw new Error('Invalid base64url length');

  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function getKey(): Promise<CryptoKey> {
  if (!cachedCryptoKey) {
    const raw = hexToBytes(VR_HEX_KEY);
    const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    cachedCryptoKey = crypto.subtle.importKey('raw', buf, { name: 'AES-GCM' }, false, ['decrypt']);
  }
  return cachedCryptoKey;
}

async function decryptStreamUrl(cipherText: string): Promise<string> {
  const bytes = base64UrlToBytes(cipherText);
  if (bytes.length < 28) throw new Error('Ciphertext too short');
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
    },
    key,
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  );
  return new TextDecoder().decode(decrypted);
}

function cdnPriorityScore(url: string): number {
  const lower = url.toLowerCase();
  if (lower.includes('vercetti.org') || lower.includes('cdn2.ngcloud.app')) return 1;
  if (lower.includes('cdn.ngcloud.app')) return 8;
  if (lower.includes('hscow.com') || lower.includes('fcxmb.com')) return 10;
  return 6;
}

function langMatchScore(streamLang: string, preferred?: string, subOrDub?: 'sub' | 'dub'): number {
  const s = streamLang.toLowerCase();
  if (preferred === 'hindi' && s.includes('hindi')) return 100;
  if (subOrDub === 'dub' && s.includes('english')) return 95;
  if (subOrDub === 'sub' && (s.includes('japanese') || s.includes('original'))) return 95;
  if (preferred && s.includes(preferred.toLowerCase())) return 90;
  if (s.includes('hindi') || s.includes('english')) return 50;
  return 20;
}

async function probeStream(url: string, streamType: 'hls' | 'mp4'): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3200);
  try {
    const res = await fetch(url, {
      method: streamType === 'mp4' ? 'HEAD' : 'GET',
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    if (streamType === 'hls') {
      const txt = await res.text();
      return txt.includes('#EXTM3U');
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSubtitleLang(label: string): string {
  const l = label.toLowerCase();
  if (l.startsWith('english')) return 'en';
  if (l.startsWith('hindi')) return 'hi';
  if (l.startsWith('spanish')) return 'es';
  if (l.startsWith('french')) return 'fr';
  if (l.startsWith('arabic')) return 'ar';
  if (l.startsWith('japanese')) return 'ja';
  if (l.startsWith('korean')) return 'ko';
  if (l.startsWith('chinese')) return 'zh';
  return label.slice(0, 2).toLowerCase() || 'en';
}

export async function extractDirectStreams(params: {
  type: 'movie' | 'tv';
  id: number;
  season?: number;
  episode?: number;
  preferredLanguage?: string;
  subOrDub?: 'sub' | 'dub';
}): Promise<DirectExtractionResult> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return { streams: [], subtitles: [] };
  }

  const path =
    params.type === 'tv'
      ? `tv/${params.id}/${params.season ?? 1}/${params.episode ?? 1}`
      : `movie/${params.id}`;

  const [apiRes, subRes] = await Promise.allSettled([
    fetch(`https://vidrock.net/api/${path}`, { cache: 'no-store' }).then(r =>
      r.ok ? r.json() : null
    ),
    fetch(`https://sub.vdrk.site/v1/${path}`).then(r => (r.ok ? r.json() : [])),
  ]);

  const rawSubs =
    subRes.status === 'fulfilled' && Array.isArray(subRes.value)
      ? (subRes.value as Array<{ label?: string; file?: string }>)
      : [];

  const subtitles: SubtitleTrack[] = rawSubs
    .filter(s => Boolean(s?.file && s?.label))
    .map(s => ({
      label: s.label as string,
      lang: normalizeSubtitleLang(s.label as string),
      url: s.file as string,
    }))
    .sort((a, b) => {
      const rank = (lbl: string) =>
        lbl.toLowerCase().startsWith('english') ? 0 : lbl.toLowerCase().startsWith('hindi') ? 1 : 2;
      return rank(a.label) - rank(b.label);
    });

  if (apiRes.status !== 'fulfilled' || !apiRes.value || typeof apiRes.value !== 'object') {
    return { streams: [], subtitles };
  }

  const rawSources = apiRes.value as Record<
    string,
    { url?: string; language?: string; type?: string }
  >;

  const decrypted: Array<DirectStreamOption & { score: number }> = [];
  await Promise.all(
    Object.entries(rawSources).map(async ([mirrorName, entry]) => {
      if (!entry?.url || entry.url.startsWith('http')) return;
      try {
        const url = await decryptStreamUrl(entry.url);
        if (!url.startsWith('http')) return;
        const streamType: 'hls' | 'mp4' = entry.type === 'mp4' ? 'mp4' : 'hls';
        const language = entry.language?.trim() || 'Original';
        const score =
          langMatchScore(language, params.preferredLanguage, params.subOrDub) +
          cdnPriorityScore(url);
        decrypted.push({
          id: mirrorName,
          label: `${language} (${mirrorName})`,
          language,
          url,
          streamType,
          score,
        });
      } catch {
        // skip invalid entry
      }
    })
  );

  if (decrypted.length === 0) {
    return { streams: [], subtitles };
  }

  // Sort by preference + reliable CDN
  decrypted.sort((a, b) => b.score - a.score);

  // Probe up to top 8 distinct candidates in parallel so the player boots on a guaranteed 200 stream
  const topCandidates = decrypted.slice(0, 8);
  const probeResults = await Promise.all(
    topCandidates.map(c => probeStream(c.url, c.streamType))
  );

  const verified = topCandidates.filter((_, i) => probeResults[i]);
  if (verified.length === 0) {
    return { streams: [], subtitles };
  }

  return {
    streams: verified.map(({ id, label, language, url, streamType }) => ({
      id,
      label,
      language,
      url,
      streamType,
    })),
    subtitles,
  };
}
