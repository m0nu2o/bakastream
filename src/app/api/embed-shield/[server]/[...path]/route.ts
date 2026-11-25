import { NextRequest, NextResponse } from 'next/server';

const UPSTREAM_SERVERS: Record<string, string> = {
  vidrock: 'https://vidrock.net',
  vidfast: 'https://player.vidzee.wtf',
  vidlink: 'https://vidlink.pro',
  'vidsrc-su': 'https://vidsrc.su',
  '2embed': 'https://www.2embed.cc',
  'vidsrc-buzz': 'https://vidsrc.buzz',
  'videm-buzz': 'https://videm.buzz',
  'vcr-2embed': 'https://streamsrcs.2embed.cc',
  vidzee: 'https://player.vidzee.wtf',
  nontongo: 'https://www.nontongo.win',
};

const SHIELD_CSP = [
  "default-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob:",
  "script-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' data: blob:",
  "script-src-elem * 'unsafe-inline' data: blob:",
  "worker-src * data: blob:",
  "connect-src * data: blob:",
  "frame-src * data: blob:",
  "style-src * 'unsafe-inline'",
  "style-src-elem * 'unsafe-inline'",
  "img-src * data: blob:",
  "font-src * data: blob:",
  "media-src * data: blob:",
].join('; ');

const TMDB_SUB_HOST = 'https://themoviedb.vidsrc.su';
const CORE_VIDZEE_HOST = 'https://core.vidzee.wtf';

function buildShieldPolyfill(serverKey: string, targetOrigin: string, realPath: string): string {
  const hostName = new URL(targetOrigin).hostname;
  return `<script>
(function() {
  var SERVER_KEY = ${JSON.stringify(serverKey)};
  if (SERVER_KEY === 'vidzee') {
    try { if (document.currentScript) document.currentScript.remove(); } catch (e) {}
  }
  var PREFIX = '/api/embed-shield/' + SERVER_KEY;
  var UPSTREAM = ${JSON.stringify(targetOrigin)};
  var REAL_PATH = ${JSON.stringify(realPath)};
  var TMDB_SUB = ${JSON.stringify(TMDB_SUB_HOST)};

  // 0. Restore exact pathname so upstream SPA/Next.js router parses routes cleanly
  try {
    if (REAL_PATH && location.pathname.indexOf(PREFIX) === 0) {
      history.replaceState(history.state, '', REAL_PATH);
    }
    if (SERVER_KEY === 'vidsrc-su') {
      window.TMDB_CLIENT_BASE_URL = PREFIX + '/__tm';
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
    var selfOrigin = location.origin;
    if (u.indexOf(selfOrigin + '/api/embed-shield/') === 0) return u;
    if (u.indexOf('/api/embed-shield/') === 0) return u;
    if (u.indexOf(selfOrigin + '/') === 0) {
      u = u.slice(selfOrigin.length);
    }
    if (u.indexOf('https://vidsrc.buzz/') === 0) return '/api/embed-shield/vidsrc-buzz/' + u.slice('https://vidsrc.buzz/'.length);
    if (u.indexOf('https://videm.buzz/') === 0) return '/api/embed-shield/videm-buzz/' + u.slice('https://videm.buzz/'.length);
    if (u.indexOf('https://streamsrcs.2embed.cc/') === 0) return '/api/embed-shield/vcr-2embed/' + u.slice('https://streamsrcs.2embed.cc/'.length);
    if ((SERVER_KEY === 'vidzee' || SERVER_KEY === 'vidfast') && u.indexOf('https://core.vidzee.wtf/') === 0) {
      return PREFIX + '/__core/' + u.slice('https://core.vidzee.wtf/'.length);
    }
    if (SERVER_KEY === 'vidsrc-su' && u.indexOf('https://themoviedb.') === 0) {
      var slashIdx = u.indexOf('/', 8);
      if (slashIdx !== -1) return PREFIX + '/__tm' + u.slice(slashIdx);
    }
    // VidRock serves poisoned placeholder JSON to datacenter/CF Worker IPs;
    // its /api/* endpoint has ACAO:* so let the browser fetch it directly.
    if (SERVER_KEY === 'vidrock' && u.indexOf('/api/') === 0) {
      return UPSTREAM + u;
    }
    if (u.indexOf(TMDB_SUB + '/') === 0) return PREFIX + '/__tm/' + u.slice(TMDB_SUB.length + 1);
    if (u.indexOf(UPSTREAM + '/') === 0) {
      var rel = u.slice(UPSTREAM.length);
      if (SERVER_KEY === 'vidrock' && rel.indexOf('/api/') === 0) return u;
      return PREFIX + rel;
    }
    if (u.charAt(0) === '/' && u.charAt(1) !== '/') return PREFIX + u;
    return u;
  }

  // 3. Intercept dynamic <script src>, <link href>, <iframe src>, and <object data="data:application/pdf..."> checks
  try {
    var scriptDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (scriptDesc && scriptDesc.set) {
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: true,
        get: function() { return scriptDesc.get.call(this); },
        set: function(v) { return scriptDesc.set.call(this, rewriteUrl(v)); }
      });
    }
    var linkDesc = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
    if (linkDesc && linkDesc.set) {
      Object.defineProperty(HTMLLinkElement.prototype, 'href', {
        configurable: true,
        get: function() { return linkDesc.get.call(this); },
        set: function(v) { return linkDesc.set.call(this, rewriteUrl(v)); }
      });
    }
    var iframeDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    if (iframeDesc && iframeDesc.set) {
      Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
        configurable: true,
        get: function() { return iframeDesc.get.call(this); },
        set: function(v) { return iframeDesc.set.call(this, rewriteUrl(v)); }
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

  // 5. Block analytics beacons cleanly
  try {
    if (navigator.sendBeacon) {
      var origBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function(url, data) {
        if (typeof url === 'string' && url.indexOf('refcheck.php') !== -1) return true;
        return origBeacon(rewriteUrl(url), data);
      };
    }
  } catch (e) {}

  // 6. Route relative/upstream fetch & XHR calls cleanly
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

  // Strip known ad/anti-adblock/sandbox-detector scripts & floating banners
  out = out.replace(/<!--ADB_START-->[\s\S]*?<!--ADB_END-->/gi, '');
  if (serverKey === 'vidzee') {
    // Keep exact script tag count so React 19 full-document hydration never mismatches
    out = out.replace(
      /<script([^>]*?)src="https:\/\/umommy\.cyou[^"]*"([^>]*)><\/script>/gi,
      '<script$1src="data:text/javascript,"$2></script>'
    );
  }
  out = out.replace(
    /<script[^>]*?(\/sbx\.js|\/lib\/aclib\.js|poringasitia|tagivi|alchemmauls|disable-devtool|whos\.amung\.us|mc\.yandex|googletagmanager|clarity\.ms|umommy|sd559908|llvpn\.com)[^>]*>[\s\S]*?<\/script>/gi,
    ''
  );
  if (serverKey === 'nontongo') {
    out = out.replace(/<script>\(function\(\)\{[\s\S]*?llvpn\.com[\s\S]*?<\/script>/gi, '');
    out = out.replace(/<script>\(function\(q,w,u\)\{[\s\S]*?<\/script>/gi, '');
  }
  out = out.replace(/<script>\(function\(\)\{var U="https:\/\/lahochat\.com\/"[\s\S]*?<\/script>/gi, '');
  out = out.replace(/try\{new Image\(\)\.src='https:\/\/whos\.amung\.us[^']*';\}catch\(e\)\{\}/gi, '');
  out = out.replace(/inject\("\/\/rq\.alchemmauls\.com[\s\S]*?\}\);/gi, '');
  out = out.replace(
    /function isReallySandboxed\(\)[\s\S]*?return false;\s*\}/gi,
    'function isReallySandboxed(){return false;}'
  );
  out = out.replace(/isReallySandboxed\(\)/g, 'false');
  out = out.replace(/var SB\s*=\s*sandboxVerdict\(\);/g, "var SB='clean';");
  out = out.replace(/sandboxVerdict\(\)/g, "'clean'");

  const prefix = `/api/embed-shield/${serverKey}`;
  out = out.replace(/<base\s+href="\/(?!\/|api\/embed-shield\/)([^"]*)"/gi, `<base href="${prefix}/$1"`);
  out = out.replace(/https:\/\/vidsrc\.buzz\//g, '/api/embed-shield/vidsrc-buzz/');
  out = out.replace(/https:\/\/videm\.buzz\//g, '/api/embed-shield/videm-buzz/');
  out = out.replace(/https:\/\/streamsrcs\.2embed\.cc\//g, '/api/embed-shield/vcr-2embed/');
  out = out.replace(/\b(src|href)="\/(?!\/|api\/embed-shield\/)([^"]*)"/gi, `$1="${prefix}/$2"`);
  out = out.replace(/\b(src|href)='\/(?!\/|api\/embed-shield\/)([^']*)'/gi, `$1='${prefix}/$2'`);
  out = out.replace(/url\(\s*\/(?!\/|api\/embed-shield\/)/gi, `url(${prefix}/`);

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

  // Neutralize VidZee Ads module cleanly while keeping ES module exports valid
  if (server === 'vidzee' && /\/assets\/Ads-[^/]+\.js$/i.test(joined)) {
    return new NextResponse('export function A(){return null;}export function E(){return null;}', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  // Handle vidsrc.su TMDB helper subdomain relay and core.vidzee.wtf stream API relay
  let targetUrl = upstreamBase + subPath;
  const isCoreVidzee = (server === 'vidzee' || server === 'vidfast') && joined.startsWith('/__core/');
  if (server === 'vidsrc-su' && joined.startsWith('/__tm/')) {
    targetUrl = TMDB_SUB_HOST + '/' + joined.slice('/__tm/'.length) + search;
    subPath = '/' + joined.slice('/__tm/'.length) + search;
  } else if (isCoreVidzee) {
    targetUrl = CORE_VIDZEE_HOST + '/' + joined.slice('/__core/'.length) + search;
    subPath = '/' + joined.slice('/__core/'.length) + search;
  }

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept:
        request.headers.get('accept') ||
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (isCoreVidzee || server !== 'vidfast') {
      reqHeaders.Referer = upstreamBase + '/';
      if (isCoreVidzee || (request.method !== 'GET' && request.method !== 'HEAD')) {
        reqHeaders.Origin = upstreamBase;
      }
    }

    const incomingCt = request.headers.get('content-type');
    if (incomingCt) reqHeaders['Content-Type'] = incomingCt;

    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined;

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: reqHeaders,
      body,
      redirect: 'follow',
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
          'Content-Security-Policy': SHIELD_CSP,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (ct.includes('javascript') || joined.endsWith('.js')) {
      let js = await upstreamRes.text();
      js = js.replace(/(["'`])\/(assets|_next)\//g, `$1/api/embed-shield/${server}/$2/`);
      js = js.replace(/https:\/\/themoviedb\.vidsrc\.su/g, `/api/embed-shield/${server}/__tm`);
      js = js.replace(/https:\/\/core\.vidzee\.wtf/g, `/api/embed-shield/${server}/__core`);
      if (server === 'vidsrc-su') {
        js = js.replace(
          /return`https:\/\/themoviedb\.\$\{t\[t\.length-2\]\}\.\$\{t\[t\.length-1\]\}\/api\/tmdb`/g,
          `return"/api/embed-shield/${server}/__tm/api/tmdb"`
        );
        js = js.replace(
          /return`https:\/\/themoviedb\.\$\{e\}\/api\/tmdb`/g,
          `return"/api/embed-shield/${server}/__tm/api/tmdb"`
        );
      }
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
