/** Minimal structural types for raw TMDB payloads. */

export interface TMDBCollection {
  results?: unknown[];
}

export interface TMDBListResponse<T> {
  results: T[];
  page?: number;
  total_results?: number;
  total_pages?: number;
}
