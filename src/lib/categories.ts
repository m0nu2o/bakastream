/**
 * Centralized Category Content Discovery Service.
 *
 * Provides structured catalog routing and metadata retrieval for all major
 * entertainment categories across movies, series, and animation.
 */

import { tmdbFetch, mapSummary } from './tmdb/server';
import type { MediaSummary, MediaType } from '@/types';

export interface CategoryDefinition {
  id: string;
  name: string;
  shortName: string;
  type: MediaType;
  description: string;
  icon: string;
  params: Record<string, string | number>;
}

export const CATEGORIES: Record<string, CategoryDefinition> = {
  anime: {
    id: 'anime',
    name: 'Anime (Japanese Animation)',
    shortName: 'Anime',
    type: 'tv',
    description:
      'Browse popular Japanese anime series and movies, from ongoing seasonals to all-time classics.',
    icon: '⚔️',
    params: {
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  },
  donghua: {
    id: 'donghua',
    name: 'Donghua (Chinese Animation)',
    shortName: 'Donghua',
    type: 'tv',
    description:
      'Legendary Chinese 3D & 2D cultivation donghua, martial arts fantasies, and epic animated sagas.',
    icon: '🐉',
    params: {
      with_genres: 16,
      with_original_language: 'zh',
      sort_by: 'popularity.desc',
    },
  },
  kdrama: {
    id: 'kdrama',
    name: 'K-Dramas (Korean Dramas)',
    shortName: 'K-Drama',
    type: 'tv',
    description:
      'Trending Korean television dramas, romance stories, mystery thrillers, and fantasy series.',
    icon: '🇰🇷',
    params: {
      with_original_language: 'ko',
      without_genres: 16,
      sort_by: 'popularity.desc',
    },
  },
  cdrama: {
    id: 'cdrama',
    name: 'C-Dramas (Chinese Dramas)',
    shortName: 'C-Drama',
    type: 'tv',
    description:
      'Captivating Chinese historical wuxia, fantasy romances, and modern television dramas.',
    icon: '🇨🇳',
    params: {
      with_original_language: 'zh',
      without_genres: 16,
      sort_by: 'popularity.desc',
    },
  },
  hollywood: {
    id: 'hollywood',
    name: 'Hollywood & English Movies',
    shortName: 'Hollywood',
    type: 'movie',
    description:
      'Global blockbuster films, studio franchises, and trending English cinematic releases.',
    icon: '🎬',
    params: {
      with_original_language: 'en',
      sort_by: 'popularity.desc',
    },
  },
  bollywood: {
    id: 'bollywood',
    name: 'Bollywood & Hindi Movies',
    shortName: 'Bollywood',
    type: 'movie',
    description:
      'Blockbuster Hindi movies, cinematic spectacles, romance classics, and award winners.',
    icon: '🍿',
    params: {
      with_original_language: 'hi',
      sort_by: 'popularity.desc',
    },
  },
  'western-tv': {
    id: 'western-tv',
    name: 'Western TV Series & Shows',
    shortName: 'Western TV',
    type: 'tv',
    description:
      'Top-rated Western television series, HBO/Netflix originals, crime dramas, and comedies.',
    icon: '📺',
    params: {
      with_original_language: 'en',
      without_genres: 16,
      sort_by: 'popularity.desc',
    },
  },
  international: {
    id: 'international',
    name: 'International Movies & World Cinema',
    shortName: 'International',
    type: 'movie',
    description:
      'Critically acclaimed international cinema from France, Spain, Germany, Japan, Korea, and beyond.',
    icon: '🌍',
    params: {
      with_original_language: 'fr|es|de|it|ko|ja|zh|tr|pt|ru|th',
      sort_by: 'popularity.desc',
    },
  },
  'hindi-web-series': {
    id: 'hindi-web-series',
    name: 'Hindi Web Series & OTT',
    shortName: 'Web Series',
    type: 'tv',
    description:
      'Top-rated Indian OTT web series, gripping crime thrillers, and acclaimed originals.',
    icon: '🇮🇳',
    params: {
      with_original_language: 'hi',
      without_genres: 10766,
      'vote_count.gte': 10,
      sort_by: 'popularity.desc',
    },
  },
  'hindi-serials': {
    id: 'hindi-serials',
    name: 'Hindi Serials & Indian TV',
    shortName: 'Hindi Serials',
    type: 'tv',
    description:
      'Popular Indian television serials, daily soaps, family dramas, and television shows.',
    icon: '📻',
    params: {
      with_original_language: 'hi',
      with_genres: 10766,
      sort_by: 'popularity.desc',
    },
  },
  cartoons: {
    id: 'cartoons',
    name: 'Cartoons & Western Animation',
    shortName: 'Cartoons',
    type: 'tv',
    description:
      'Beloved animated series, family favorites, comedy animations, and timeless classics.',
    icon: '🎨',
    params: {
      with_genres: 16,
      with_original_language: 'en',
      sort_by: 'popularity.desc',
    },
  },
};

// Aliases for seamless URL matching (e.g., /k-drama, /c-drama, /donghua, /western-tv)
const ALIASES: Record<string, string> = {
  'k-drama': 'kdrama',
  korean: 'kdrama',
  'k-dramas': 'kdrama',
  kdramas: 'kdrama',
  'c-drama': 'cdrama',
  chinese: 'cdrama',
  'c-dramas': 'cdrama',
  cdramas: 'cdrama',
  donghua: 'donghua',
  'chinese-anime': 'donghua',
  'chinese-animation': 'donghua',
  hindi: 'bollywood',
  'hindi-movies': 'bollywood',
  'bollywood-movies': 'bollywood',
  'indian-movies': 'bollywood',
  serials: 'hindi-serials',
  'hindi-tv': 'hindi-serials',
  'indian-tv': 'hindi-serials',
  'indian-serials': 'hindi-serials',
  'web-series': 'hindi-web-series',
  'indian-web-series': 'hindi-web-series',
  'indian-series': 'hindi-web-series',
  'western-tv': 'western-tv',
  'western-series': 'western-tv',
  'tv-shows': 'western-tv',
  'english-series': 'western-tv',
  'hollywood-movies': 'hollywood',
  'korean-dramas': 'kdrama',
  'chinese-dramas': 'cdrama',
  'international-movies': 'international',
  'world-cinema': 'international',
  cartoon: 'cartoons',
  animation: 'cartoons',
};

export function getCategory(idOrAlias: string): CategoryDefinition | null {
  if (!idOrAlias) return null;
  const clean = idOrAlias.toLowerCase().trim();
  const direct = CATEGORIES[clean];
  if (direct) return direct;
  const targetId = ALIASES[clean];
  if (targetId && CATEGORIES[targetId]) {
    return CATEGORIES[targetId];
  }
  return null;
}

export function listCategories(): CategoryDefinition[] {
  return Object.values(CATEGORIES);
}

export interface CategoryFetchOptions {
  page?: number;
  genre?: number;
  year?: number;
  sortBy?: string;
  type?: MediaType;
}

export async function fetchCategoryItems(
  categoryId: string,
  optionsOrPage: number | CategoryFetchOptions = 1
): Promise<{ category: CategoryDefinition; items: MediaSummary[]; totalPages: number } | null> {
  const category = getCategory(categoryId);
  if (!category) return null;

  const options: CategoryFetchOptions =
    typeof optionsOrPage === 'number' ? { page: optionsOrPage } : optionsOrPage;

  const page = Math.max(1, options.page || 1);
  const mediaType: MediaType = options.type || category.type;
  const endpoint = `/discover/${mediaType}`;

  const rawParams: Record<string, string | number> = {
    page,
    include_adult: 'false',
    ...category.params,
  };

  if (options.sortBy) {
    rawParams.sort_by = options.sortBy;
  }

  if (options.year) {
    if (mediaType === 'movie') {
      rawParams.primary_release_date_year = options.year;
    } else {
      rawParams.first_air_date_year = options.year;
    }
  }

  if (options.genre) {
    if (rawParams.with_genres) {
      rawParams.with_genres = `${rawParams.with_genres},${options.genre}`;
    } else {
      rawParams.with_genres = options.genre;
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await tmdbFetch<{ results: any[]; total_pages?: number }>(endpoint, {
      params: rawParams,
      revalidate: 900,
    });
    const items = (data.results ?? []).map(mapSummary);
    const totalPages = Math.min(data.total_pages || 1, 500);
    return { category, items, totalPages };
  } catch (err) {
    console.error(`Failed to fetch category ${categoryId}:`, err);
    return { category, items: [], totalPages: 1 };
  }
}
