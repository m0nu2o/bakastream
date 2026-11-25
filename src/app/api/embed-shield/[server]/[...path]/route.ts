import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_SERVERS: Record<string, string> = {
  vidrock: 'https://vidrock.net',
  vidfast: 'https://vidfast.pro',
  vidlink: 'https://vidlink.pro',
  'vidsrc-su': 'https://vidsrc.su',
  '2embed': 'https://www.2embed.cc',
};

const TMDB_SUB_HOST = 'https://themoviedb.vidsrc.su';

function buildShieldPolyfill(serverKey: string, targetOrigin: string, realPath: string): string {
  const hostName = new URL(targetOrigin).hostname;
  return `<script>
(function() {
  var PREFIX = '/api/embed-shield/${serverKey}';
  var UPSTREAM = ${JSON.stringify(targetOrigin)};
  var REAL_PATH = ${JSON.stringify(realPath)};
  var TMDB_SUB = ${JSON.stringify(TMDB_SUB_HOST)};

  // 0. Restore exact pathname so upstream SPA/Next.js router parses routes cleanly
  try {
    if (REAL_PATH && location.pathname.indexOf(PREFIX) === 0) {
      history.replaceState(history.state, '', REAL_PATH);
    }
  } catch (e) {}

  // 1. Hide frameElement so sandbox attribute is invisible
  try {
    Object.defineProperty(window, 'frameElement', {
      configurable: true,
      get: function() { return null; }
    });
  } catch (e) {}

  // 2. Neutralize document.domain SecurityError check in sandboxed iframes
  try {
    var fakeDomain = ${JSON.stringify(hostName)};
    Object.defineProperty(Document.prototype, 'domain', {
      configurable: true,
      get: function() { return fakeDomain; },
      set: function(v) { fakeDomain = v; return v; }
    });
  } catch (e) {}

  function rewriteUrl(u) {
    if (typeof u !== 'string') return u;
    if (u.indexOf(PREFIX) === 0) return u;
    if (u.indexOf(TMDB_SUB + '/') === 0) return PREFIX + '/__tm/' + u.slice(TMDB_SUB.length + 1);
    if (u.indexOf(UPSTREAM + '/') === 0) return PREFIX + u.slice(UPSTREAM.length);
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') return PREFIX + u;
    return u;
  }

  // 3. Intercept dynamic <script src> and <object data="data:application/pdf..."> sandbox checks
  try {
    var scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (scriptDesc && scriptDesc.set) {
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: true,
        get: function() { return scriptDesc.get.call(this); },
        set: function(v) { return scriptDesc.set.call(this, rewriteUrl(v)); }
      });
    }
    var origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(k, v) {
      if ((k === 'src' || k === 'href') && typeof v === 'string' && this.tagName !== 'A') {
        v = rewriteUrl(v);
      }
      if (k === 'data' && this.tagName === 'OBJECT' && typeof v === 'string' && v.indexOf('application/pdf') !== -1) {
        var self = this;
        setTimeout(function() {
          if (typeof self.onload === 'function') self.onload();
          self.dispatchEvent(new Event('load'));
        }, 10);
        return;
      }
      return origSetAttr.call(this, k, v);
    };
    var objDesc = Object.getOwnPropertyDescriptor(HTMLObjectElement.prototype, 'data');
    if (objDesc && objDesc.set) {
      Object.defineProperty(HTMLObjectElement.prototype, 'data', {
        configurable: true,
        get: function() { return objDesc.get.call(this); },
        set: function(v) {
          if (typeof v === 'string' && v.indexOf('application/pdf') !== -1) {
            var self = this;
            setTimeout(function() {
              if (typeof self.onload === 'function') self.onload();
              self.dispatchEvent(new Event('load'));
            }, 10);
            return v;
          }
          return objDesc.set.call(this, v);
        }
      });
    }
  } catch (e) {}

  // 4. Block popup ads while fooling popup-detector checks
  window.open = function() {
    return {
      closed: false,
      focus: function() {},
      blur: function() {},
      close: function() {},
      postMessage: function() {},
      document: { open: function() {}, write: function() {}, close: function() {} },
      location: { href: 'about:blank', replace: function() {}, assign: function() {} }
    };
  };

  // 5. Route relative/upstream fetch & XHR calls through same-origin shield relay
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = rewriteUrl(input);
      } else if (input && typeof input.url === 'string') {
        var nextUrl = rewriteUrl(input.url);
        if (nextUrl !== input.url) {
          input = new Request(nextUrl, input);
        }
      }
      return origFetch.call(this, input, init);
    };
  }

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    arguments[1] = rewriteUrl(url);
    return origOpen.apply(this, arguments);
  };
})();
</script>`;
}

function rewriteEmbedHtml(html: string, serverKey: string, targetOrigin: string, realPath: string): string {
  let out = html;

  // Strip known ad/anti-adblock/sandbox-detector scripts
  out = out.replace(/<!--ADB_START-->[\s\S]*?<!--ADB_END-->/gi, '');
  out = out.replace(
    /<script[^>]*?(\/sbx\.js|\/lib\/aclib\.js|poringasitia|tagivi|alchemmauls|disable-devtool|whos\.amung\.us|mc\.yandex|googletagmanager)[^>]*>[\s\S]*?<\/script>/gi,
    ''
  );
  out = out.replace(/inject\("\/\/rq\.alchemmauls\.com[\s\S]*?\}\);/gi, '');
  out = out.replace(
    /function isReallySandboxed\(\)[\s\S]*?return false;\s*\}/gi,
    'function isReallySandboxed(){return false;}'
  );
  out = out.replace(/isReallySandboxed\(\)/g, 'false');

  const prefix = `/api/embed-shield/${serverKey}`;
  out = out.replace(/\b(src|href)="\/(?!\/|api\/embed-shield\/)([^"]*)"/gi, `$1="${prefix}/$2"`);
  out = out.replace(/\b(src|href)='\/(?!\/|api\/embed-shield\/)([^']*)'/gi, `$1='${prefix}/$2'`);

  const polyfill = buildShieldPolyfill(serverKey, targetOrigin, realPath);
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${polyfill}`);
  } else {
    out = polyfill + out;
  }
  return out;
}

async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ server: string; path?: string[] }> }
) {
  const { server, path } = await params;
  const upstreamBase = UPSTREAM_SERVERS[server];
  if (!upstreamBase) {
    return NextResponse.json({ error: 'Invalid embed shield server' }, { status: 403 });
  }

  const joined = path && path.length > 0 ? '/' + path.join('/') : '/';
  const search = request.nextUrl.search || '';
  let subPath = joined + search;

  // Handle vidsrc.su TMDB helper subdomain relay
  let targetUrl = upstreamBase + subPath;
  if (server === 'vidsrc-su' && joined.startsWith('/__tm/')) {
    targetUrl = TMDB_SUB_HOST + '/' + joined.slice('/__tm/'.length) + search;
    subPath = '/' + joined.slice('/__tm/'.length) + search;
  }

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: upstreamBase + '/',
      Origin: upstreamBase,
    };

    const incomingCt = request.headers.get('content-type');
    if (incomingCt) reqHeaders['Content-Type'] = incomingCt;
    const incomingAccept = request.headers.get('accept');
    if (incomingAccept) reqHeaders['Accept'] = incomingAccept;

    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: reqHeaders,
      body,
    });

    const ct = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const isStaticAsset =
      joined.startsWith('/_next/static/') ||
      joined.startsWith('/assets/') ||
      /\.(js|css|woff2?|png|svg|ico)$/i.test(joined);

    const cacheControl = isStaticAsset
      ? 'public, max-age=86400, s-maxage=86400'
      : 'no-store';

    if (ct.includes('text/html')) {
      const rawHtml = await upstreamRes.text();
      const rewritten = rewriteEmbedHtml(rawHtml, server, upstreamBase, subPath);
      return new NextResponse(rewritten, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (ct.includes('javascript') || joined.endsWith('.js')) {
      let js = await upstreamRes.text();
      js = js.replace(/(["'`])\/(assets|_next)\//g, `$1/api/embed-shield/${server}/$2/`);
      js = js.replace(/https:\/\/themoviedb\.vidsrc\.su\//g, `/api/embed-shield/${server}/__tm/`);
      return new NextResponse(js, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': ct,
          'Cache-Control': cacheControl,
        },
      });
    }

    if (ct.includes('text/css') || joined.endsWith('.css')) {
      let css = await upstreamRes.text();
      css = css.replace(/url\((["']?)\/(?!\/|api\/embed-shield\/)/gi, `url($1/api/embed-shield/${server}/`);
      return new NextResponse(css, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': ct,
          'Cache-Control': cacheControl,
        },
      });
    }

    const buf = await upstreamRes.arrayBuffer();
    return new NextResponse(buf, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': cacheControl,
      },
    });
  } catch (err) {
    console.warn(`[EmbedShield] Upstream failed for ${server}${joined}:`, err);
    return NextResponse.json({ error: 'Upstream embed unreachable' }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ server: string; path?: string[] }> }
) {
  return handleProxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ server: string; path?: string[] }> }
) {
  return handleProxy(request, context);
}
