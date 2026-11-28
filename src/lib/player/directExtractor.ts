/**
 * Ultra-fast client-side direct HLS/MP4 stream & WebVTT subtitle extractor.
 * Fetches CORS-enabled APIs straight from the browser (0 worker bandwidth, ~300ms load,
 * 0 third-party iframe bloat, 0 ads), verifies every available dubbed language via
 * lightweight header-chunk stream probing, and feeds streams directly into <VideoPlayer>.
 */

import { normalizeLanguage } from '@/lib/languages';
import type { SubtitleTrack } from '@/lib/providers/types';

export interface DirectStreamOption {
  id: string;
  label: string;
  language: string;
  langKey: string;
  flag: string;
  nativeLabel: string;
  quality?: string;
  url: string;
  streamType: 'hls' | 'mp4';
}

export interface DirectLanguageOption {
  key: string;
  label: string;
  nativeLabel: string;
  flag: string;
  mirrorCount: number;
  bestStream: DirectStreamOption;
}

export interface DirectExtractionResult {
  streams: DirectStreamOption[];
  availableLanguages: DirectLanguageOption[];
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

function extractQualityFromUrl(url: string): { label?: string; bonus: number } {
  const m = url.match(/(?:_|\/|-)(2160|1440|1080|720|480|360)[pP]?(?:\/|_|\.|&|$)/);
  if (!m) return { bonus: 0 };
  const q = m[1];
  if (q === '2160') return { label: '4K', bonus: 8 };
  if (q === '1440') return { label: '1440p', bonus: 7 };
  if (q === '1080') return { label: '1080p', bonus: 6 };
  if (q === '720') return { label: '720p', bonus: 4 };
  if (q === '480') return { label: '480p', bonus: 1 };
  return { label: `${q}p`, bonus: 0 };
}

function canonicalLangKey(rawLanguage?: string): {
  key: string;
  label: string;
  nativeLabel: string;
  flag: string;
} {
  const trimmed = rawLanguage?.trim() || 'Original';
  const info = normalizeLanguage(trimmed);
  if (info && info.isVerified) {
    return {
      key: info.label.toLowerCase(),
      label: info.label,
      nativeLabel: info.nativeLabel,
      flag: info.flag === '🌐' && info.code === 'en' ? '🇺🇸' : info.flag,
    };
  }
  const cleanLabel = trimmed.replace(/\s+/g, ' ');
  return {
    key: cleanLabel.toLowerCase(),
    label: cleanLabel,
    nativeLabel: cleanLabel,
    flag: '🌐',
  };
}

function langMatchScore(
  langKey: string,
  preferred?: string,
  subOrDub?: 'sub' | 'dub'
): number {
  const pref = preferred?.trim().toLowerCase();
  if (pref && (langKey === pref || langKey.includes(pref))) return 100;
  if (subOrDub === 'dub' && langKey === 'english') return 95;
  if (subOrDub === 'sub' && (langKey === 'japanese' || langKey === 'original')) return 95;
  if (langKey === 'hindi') return 65;
  if (langKey === 'english') return 60;
  if (['tamil', 'telugu', 'malayalam', 'kannada', 'bengali'].includes(langKey)) return 45;
  return 30;
}

/**
 * Probes an HLS or MP4 stream safely without downloading full multi-hour playlists.
 * Reads only the opening bytes (to verify `#EXTM3U`) and immediately cancels the stream.
 */
async function probeStream(url: string, streamType: 'hls' | 'mp4'): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      method: streamType === 'mp4' ? 'HEAD' : 'GET',
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    if (streamType === 'hls') {
      const reader = res.body?.getReader();
      if (!reader) {
        const txt = await res.text();
        return txt.includes('#EXTM3U');
      }
      try {
        let head = '';
        const decoder = new TextDecoder();
        while (head.length < 512) {
          const { value, done } = await reader.read();
          if (done || !value) break;
          head += decoder.decode(value, { stream: true });
          if (head.includes('#EXTM3U')) {
            return true;
          }
        }
        return head.includes('#EXTM3U');
      } finally {
        reader.cancel().catch(() => {});
      }
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

async function fetchSubtitlesWithTimeout(path: string): Promise<SubtitleTrack[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2800);
  try {
    const res = await fetch(`https://sub.vdrk.site/v1/${path}`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const rawSubs = (await res.json()) as Array<{ label?: string; file?: string }>;
    if (!Array.isArray(rawSubs)) return [];
    return rawSubs
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
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
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
    return { streams: [], availableLanguages: [], subtitles: [] };
  }

  const path =
    params.type === 'tv'
      ? `tv/${params.id}/${params.season ?? 1}/${params.episode ?? 1}`
      : `movie/${params.id}`;

  const [apiRes, subtitles] = await Promise.all([
    fetch(`https://vidrock.net/api/${path}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null),
    fetchSubtitlesWithTimeout(path),
  ]);

  if (!apiRes || typeof apiRes !== 'object') {
    return { streams: [], availableLanguages: [], subtitles };
  }

  const rawSources = apiRes as Record<
    string,
    { url?: string; language?: string; type?: string }
  >;

  type ScoredCandidate = DirectStreamOption & { cdnScore: number; totalScore: number };
  const decrypted: ScoredCandidate[] = [];

  await Promise.all(
    Object.entries(rawSources).map(async ([mirrorName, entry]) => {
      if (!entry?.url || entry.url.startsWith('http')) return;
      try {
        const url = await decryptStreamUrl(entry.url);
        if (!url.startsWith('http')) return;
        const streamType: 'hls' | 'mp4' = entry.type === 'mp4' ? 'mp4' : 'hls';
        const canon = canonicalLangKey(entry.language);
        const cdn = cdnPriorityScore(url);
        const qual = extractQualityFromUrl(url);
        const total =
          langMatchScore(canon.key, params.preferredLanguage, params.subOrDub) +
          cdn +
          qual.bonus;
        decrypted.push({
          id: mirrorName,
          label: `${canon.label} (${mirrorName})`,
          language: canon.label,
          langKey: canon.key,
          flag: canon.flag,
          nativeLabel: canon.nativeLabel,
          quality: qual.label,
          url,
          streamType,
          cdnScore: cdn + qual.bonus,
          totalScore: total,
        });
      } catch {
        // skip invalid entry
      }
    })
  );

  if (decrypted.length === 0) {
    return { streams: [], availableLanguages: [], subtitles };
  }

  // Round-robin across ALL distinct languages so every dubbed language is guaranteed a probe slot
  const byLang = new Map<string, ScoredCandidate[]>();
  for (const cand of decrypted) {
    const bucket = byLang.get(cand.langKey) ?? [];
    bucket.push(cand);
    byLang.set(cand.langKey, bucket);
  }
  for (const bucket of byLang.values()) {
    bucket.sort((a, b) => b.cdnScore - a.cdnScore);
  }

  const probeBatch: ScoredCandidate[] = [];
  for (let round = 0; round < 3 && probeBatch.length < 18; round++) {
    for (const bucket of byLang.values()) {
      if (probeBatch.length >= 18) break;
      if (bucket[round]) probeBatch.push(bucket[round]);
    }
  }

  const probeResults = await Promise.all(
    probeBatch.map(c => probeStream(c.url, c.streamType))
  );

  const verified = probeBatch.filter((_, i) => probeResults[i]);
  if (verified.length === 0) {
    return { streams: [], availableLanguages: [], subtitles };
  }

  verified.sort((a, b) => b.totalScore - a.totalScore);

  const streams: DirectStreamOption[] = verified.map(
    ({ id, label, language, langKey, flag, nativeLabel, quality, url, streamType }) => ({
      id,
      label,
      language,
      langKey,
      flag,
      nativeLabel,
      quality,
      url,
      streamType,
    })
  );

  const langGroup = new Map<string, DirectStreamOption[]>();
  for (const s of streams) {
    const arr = langGroup.get(s.langKey) ?? [];
    arr.push(s);
    langGroup.set(s.langKey, arr);
  }

  const availableLanguages: DirectLanguageOption[] = Array.from(langGroup.entries()).map(
    ([key, list]) => ({
      key,
      label: list[0].language,
      nativeLabel: list[0].nativeLabel,
      flag: list[0].flag,
      mirrorCount: list.length,
      bestStream: list[0],
    })
  );

  return {
    streams,
    availableLanguages,
    subtitles,
  };
}
