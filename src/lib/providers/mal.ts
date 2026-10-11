/**
 * AniList / MyAnimeList (MAL) ID resolver for Anime content.
 *
 * Uses the free, auth-less AniList GraphQL API to map anime titles to their
 * official MyAnimeList ID, enabling sub/dub streaming via dedicated anime engines.
 */

const malCache = new Map<string, number>();

export async function getMalIdForAnime(title: string): Promise<number | null> {
  if (!title) return null;

  const cleanTitle = title
    .replace(/Season \d+/i, '')
    .replace(/Part \d+/i, '')
    .replace(/:\s*Hashira Training Arc/i, '')
    .replace(/:\s*Entertainment District Arc/i, '')
    .replace(/:\s*Mugen Train Arc/i, '')
    .trim();

  if (malCache.has(cleanTitle)) {
    return malCache.get(cleanTitle) ?? null;
  }

  const query = `query ($search: String) {
    Media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      idMal
      title {
        english
        romaji
      }
    }
  }`;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: cleanTitle } }),
      next: { revalidate: 86400 }, // Cache mapping for 24 hours
    });

    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { idMal?: number } };
    };
    const idMal = json.data?.Media?.idMal ?? null;
    if (idMal) {
      malCache.set(cleanTitle, idMal);
    }
    return idMal;
  } catch {
    return null;
  }
}
