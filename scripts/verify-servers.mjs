const servers = [
  { id: 'vidlink', name: 'VidLink HD', movie: 'https://vidlink.pro/movie/550?autoplay=true&primaryColor=f43b4c', tv: 'https://vidlink.pro/tv/1399/1/1?autoplay=true&primaryColor=f43b4c', anime: 'https://vidlink.pro/anime/20/1/1?primaryColor=f43b4c&autoplay=true' },
  { id: 'vidsrc-su', name: 'VidSrc.su Ultra', movie: 'https://vidsrc.su/embed/movie/550', tv: 'https://vidsrc.su/embed/tv/1399/1/1', anime: 'https://vidsrc.su/embed/tv/1399/1/1?dub=1' },
  { id: 'vidsrc-pm', name: 'VidSrc Global Mirror', movie: 'https://vidsrc.pm/embed/movie/550', tv: 'https://vidsrc.pm/embed/tv/1399/1/1', anime: 'https://vidsrc.pm/embed/tv/1399/1/1' },
  { id: 'vidfast', name: 'VidFast Ultra', movie: 'https://vidfast.vc/movie/550?autoPlay=1', tv: 'https://vidfast.vc/tv/1399/1/1?autoPlay=1', anime: 'https://vidfast.vc/tv/1399/1/1?autoPlay=1' },
  { id: 'autoembed', name: 'AutoEmbed Cloud', movie: 'https://autoembed.co/movie/tmdb/550', tv: 'https://autoembed.co/tv/tmdb/1399-1-1', anime: 'https://autoembed.co/tv/tmdb/1399-1-1' },
  { id: '2embed', name: '2Embed Direct', movie: 'https://2embed.skin/embed/550', tv: 'https://2embed.skin/embedtv/1399&s=1&e=1', anime: 'https://2embed.skin/embedtv/1399&s=1&e=1' },
  { id: 'screenscape', name: 'ScreenScape India (Hindi)', movie: 'https://screenscape.me/embed?tmdb=550&type=movie&lan=hi', tv: 'https://screenscape.me/embed?tmdb=1399&type=tv&s=1&e=1&lan=hi', anime: 'https://screenscape.me/embed?tmdb=1399&type=tv&s=1&e=1&lan=hi' }
];

async function verifyAll() {
  console.log('Testing 7 Core Streaming Engines across Movie, TV, and Anime...');
  for (const s of servers) {
    for (const [type, url] of Object.entries(s)) {
      if (['id', 'name'].includes(type)) continue;
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(5000)
        });
        console.log(`[PASS] ${res.status} | ${s.name} (${type}) -> ${url}`);
      } catch (err) {
        console.log(`[FAIL] ${s.name} (${type}) -> ${err.message}`);
      }
    }
  }
}
verifyAll();
