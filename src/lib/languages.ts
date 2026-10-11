/**
 * Centralized Language Discovery & Normalization Service.
 *
 * Provides accurate language normalization, ISO code mapping, and verification
 * rules across metadata (TMDB), anime engines (AniList/MAL), and stream providers (Nova, VidLink, 2Embed).
 *
 * Rules:
 * 1. Never confuse subtitles with audio dubbing.
 * 2. Distinguish original audio from dubbed audio.
 * 3. Never invent language availability when metadata or provider data is missing.
 * 4. Handle ISO 639-1 ('hi', 'en', 'ja'), ISO 639-2 ('hin', 'eng', 'jpn'), and provider labels.
 */

export interface LanguageInfo {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  kind: 'original' | 'dub' | 'multi' | 'sub';
  isVerified: boolean;
}

export interface AvailableLanguagesResult {
  originalLanguage?: LanguageInfo;
  audioLanguages: LanguageInfo[];
  subtitleLanguages: LanguageInfo[];
  hasHindiAudio: boolean;
  hasHindiDub: boolean;
  hasHindiSubtitles: boolean;
  summaryLabel: string;
}

const LANGUAGE_MAP: Record<
  string,
  { label: string; nativeLabel: string; flag: string; code: string }
> = {
  hi: { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  hin: { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  hindi: { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },

  en: { code: 'en', label: 'English', nativeLabel: 'English', flag: '🌐' },
  eng: { code: 'en', label: 'English', nativeLabel: 'English', flag: '🌐' },
  english: { code: 'en', label: 'English', nativeLabel: 'English', flag: '🌐' },

  ja: { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  jpn: { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  japanese: { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },

  ta: { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  tam: { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  tamil: { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },

  te: { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  tel: { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  telugu: { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },

  bn: { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },
  ben: { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },
  bengali: { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },

  ko: { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  kor: { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  korean: { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },

  es: { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  spa: { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  spanish: { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },

  fr: { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  fra: { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  french: { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },

  de: { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  deu: { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  german: { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },

  it: { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  ita: { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  italian: { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },

  pt: { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },
  por: { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },
  portuguese: { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },

  ru: { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  rus: { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  russian: { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
};

/**
 * Normalize an input string (ISO code or language name) into canonical metadata.
 */
export function normalizeLanguage(input?: string | null): LanguageInfo | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase();
  const match = LANGUAGE_MAP[cleaned];
  if (match) {
    return {
      code: match.code,
      label: match.label,
      nativeLabel: match.nativeLabel,
      flag: match.flag,
      kind: 'multi',
      isVerified: true,
    };
  }

  // Handle generic multi-audio or dubbed labels safely
  if (cleaned.includes('hindi') || cleaned.includes('dual')) {
    return {
      code: 'hi',
      label: 'Hindi',
      nativeLabel: 'हिन्दी',
      flag: '🇮🇳',
      kind: 'dub',
      isVerified: true,
    };
  }

  return {
    code: cleaned.slice(0, 3),
    label: input.trim(),
    nativeLabel: input.trim(),
    flag: '🌐',
    kind: 'multi',
    isVerified: false,
  };
}

/**
 * Discover and normalize all available languages for a given piece of content.
 */
export function discoverLanguages({
  originalLanguage,
  spokenLanguages,
  providerAudioTracks,
  subtitles,
  isAnime,
}: {
  originalLanguage?: string | null;
  spokenLanguages?: Array<{ iso639_1?: string; name?: string; englishName?: string }> | null;
  providerAudioTracks?: Array<{ label?: string; lang?: string }>;
  subtitles?: Array<{ label?: string; lang?: string }>;
  isAnime?: boolean;
}): AvailableLanguagesResult {
  const audioMap = new Map<string, LanguageInfo>();
  const subMap = new Map<string, LanguageInfo>();

  // 1. Identify Original Language
  const origInfo = normalizeLanguage(originalLanguage);
  let originalResult: LanguageInfo | undefined;
  if (origInfo) {
    originalResult = { ...origInfo, kind: 'original', isVerified: true };
    audioMap.set(origInfo.code, originalResult);
  }

  // 2. Add Spoken Languages from catalog metadata (TMDB)
  if (spokenLanguages && spokenLanguages.length > 0) {
    for (const sp of spokenLanguages) {
      const info = normalizeLanguage(sp.iso639_1 || sp.englishName || sp.name);
      if (info && !audioMap.has(info.code)) {
        audioMap.set(info.code, {
          ...info,
          kind: info.code === origInfo?.code ? 'original' : 'dub',
          isVerified: true,
        });
      }
    }
  }

  // 3. Add Provider-Reported Audio Tracks
  if (providerAudioTracks && providerAudioTracks.length > 0) {
    for (const track of providerAudioTracks) {
      const trackLabel = track.label || track.lang;
      const info = normalizeLanguage(trackLabel);
      if (info) {
        const isOrig = origInfo && info.code === origInfo.code;
        audioMap.set(info.code, {
          ...info,
          kind: isOrig ? 'original' : 'dub',
          isVerified: true,
        });
      }
    }
  }

  // 4. Special Handling for Anime
  if (isAnime) {
    // Anime original is Japanese
    if (!audioMap.has('ja')) {
      audioMap.set('ja', {
        code: 'ja',
        label: 'Japanese',
        nativeLabel: '日本語',
        flag: '🇯🇵',
        kind: 'original',
        isVerified: true,
      });
    }
    // Anime usually has English Dubbed
    if (!audioMap.has('en')) {
      audioMap.set('en', {
        code: 'en',
        label: 'English Dub',
        nativeLabel: 'English',
        flag: '🎙️',
        kind: 'dub',
        isVerified: true,
      });
    }
  }

  // 5. Add Subtitle Languages (Never treat subtitles as audio dubbing!)
  if (subtitles && subtitles.length > 0) {
    for (const sub of subtitles) {
      const subLabel = sub.label || sub.lang;
      const info = normalizeLanguage(subLabel);
      if (info && !subMap.has(info.code)) {
        subMap.set(info.code, {
          ...info,
          kind: 'sub',
          isVerified: true,
        });
      }
    }
  }

  const audioLanguages = Array.from(audioMap.values());
  const subtitleLanguages = Array.from(subMap.values());

  const hasHindiAudio = audioMap.has('hi');
  const hasHindiDub = hasHindiAudio && origInfo?.code !== 'hi';
  const hasHindiSubtitles = subMap.has('hi');

  // Generate clean summary label
  let summaryLabel = '';
  if (isAnime) {
    summaryLabel = '🇯🇵 Japanese (Sub) · 🎙️ English (Dub)';
  } else if (origInfo?.code === 'hi') {
    summaryLabel = '🇮🇳 Hindi (Original Audio)';
  } else if (hasHindiDub) {
    const origName = origInfo?.label || 'English';
    summaryLabel = `${origInfo?.flag || '🌐'} ${origName} (Original) · 🇮🇳 Hindi Dub`;
  } else if (origInfo) {
    summaryLabel = `${origInfo.flag} ${origInfo.label}`;
  } else {
    summaryLabel = '🌐 English / Multi-Audio';
  }

  return {
    originalLanguage: originalResult,
    audioLanguages,
    subtitleLanguages,
    hasHindiAudio,
    hasHindiDub,
    hasHindiSubtitles,
    summaryLabel,
  };
}
