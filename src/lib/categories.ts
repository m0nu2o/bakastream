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
    name: 'Anime',
    shortName: 'Anime',
    type: 'tv',
    description: 'Browse popular Japanese anime series, from ongoing seasonals to all-time classics.',
    icon: '⚔️',
    params: {
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
    },
  },
  'hindi-serials': {
    id: 'hindi-serials',
    name: 'Hindi Serials & Indian TV',
    shortName: 'Hindi Serials',
    type: 'tv',
    description: 'Popular Indian television serials, daily soaps, family dramas, and television shows.',
    icon: '📺',
    params: {
      with_original_language: 'hi',
      with_origin_country: 'IN',
      'vote_count.lte': 40,
      sort_by: 'popularity.desc',
    },
  },
  'hindi-web-series': {
    id: 'hindi-web-series',
    name: 'Hindi Web Series',
    shortName: 'Web Series',
    type: 'tv',
    description: 'Top-rated Indian OTT web series, gripping crime thrillers, and acclaimed originals.',
    icon: '🇮🇳',
    params: {
      with_original_language: 'hi',
      without_genres: 10766,
      'vote_count.gte': 15,
      sort_by: 'vote_count.desc',
    },
  },
  bollywood: {
    id: 'bollywood',
    name: 'Bollywood & Hindi Movies',
    shortName: 'Bollywood',
    type: 'movie',
    description: 'Blockbuster Hindi movies, cinematic spectacles, romance classics, and award winners.',
    icon: '🍿',
    params: {
      with_original_language: 'hi',
      with_origin_country: 'IN',
      sort_by: 'popularity.desc',
    },
  },
  hollywood: {
    id: 'hollywood',
    name: 'Hollywood Movies',
    shortName: 'Hollywood',
    type: 'movie',
    description: 'Global blockbuster films, studio franchises, and trending English cinematic releases.',
    icon: '🎬',
    params: {
      with_original_language: 'en',
      with_origin_country: 'US',
      sort_by: 'popularity.desc',
    },
  },
  kdrama: {
    id: 'kdrama',
    name: 'K-Dramas (Korean Dramas)',
    shortName: 'K-Drama',
    type: 'tv',
    description: 'Trending Korean television dramas, romance stories, mystery thrillers, and fantasy series.',
    icon: '🇰🇷',
    params: {
      with_original_language: 'ko',
      with_origin_country: 'KR',
      sort_by: 'popularity.desc',
    },
  },
  cdrama: {
    id: 'cdrama',
    name: 'C-Dramas (Chinese Dramas)',
    shortName: 'C-Drama',
    type: 'tv',
    description: 'Captivating Chinese historical wuxia, fantasy romances, and modern television dramas.',
    icon: '🇨🇳',
    params: {
      with_original_language: 'zh',
      with_origin_country: 'CN',
      sort_by: 'popularity.desc',
    },
  },
  cartoons: {
    id: 'cartoons',
    name: 'Cartoons & Western Animation',
    shortName: 'Cartoons',
    type: 'tv',
    description: 'Beloved animated series, family favorites, comedy animations, and timeless classics.',
    icon: '🎨',
    params: {
      with_genres: 16,
      with_original_language: 'en',
      sort_by: 'popularity.desc',
    },
  },
  international: {
    id: 'international',
    name: 'International Dramas',
    shortName: 'International',
    type: 'tv',
    description: 'Critically acclaimed Turkish series, Spanish thrillers, and European television dramas.',
    icon: '🌍',
    params: {
      with_original_language: 'tr',
      sort_by: 'popularity.desc',
    },
  },
};

// Aliases for seamless URL matching (e.g., /k-drama, /c-drama, /korean, /chinese)
const ALIASES: Record<string, string> = {
  'k-drama': 'kdrama',
  korean: 'kdrama',
  'k-dramas': 'kdrama',
  kdramas: 'kdrama',
  'c-drama': 'cdrama',
  chinese: 'cdrama',
  'c-dramas': 'cdrama',
  cdramas: 'cdrama',
  hindi: 'bollywood',
  'hindi-movies': 'bollywood',
  serials: 'hindi-serials',
  'web-series': 'hindi-web-series',
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

export async function fetchCategoryItems(
  categoryId: string,
  page = 1
): Promise<{ category: CategoryDefinition; items: MediaSummary[] } | null> {
  const category = getCategory(categoryId);
  if (!category) return null;

  const endpoint = `/discover/${category.type}`;
  const rawParams = {
    page,
    include_adult: 'false',
    ...category.params,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await tmdbFetch<{ results: any[] }>(endpoint, {
      params: rawParams,
      revalidate: 900,
    });
    const items = (data.results ?? []).map(mapSummary);
    return { category, items };
  } catch (err) {
    console.error(`Failed to fetch category ${categoryId}:`, err);
    return { category, items: [] };
  }
}
