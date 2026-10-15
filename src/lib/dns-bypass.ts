import dns from 'node:dns';

let isPatched = false;

export function setupDnsBypass() {
  if (isPatched || typeof window !== 'undefined') return;
  isPatched = true;

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    const origLookup = dns.lookup.bind(dns);

    type LookupCallback = (
      err: NodeJS.ErrnoException | null,
      address: string | dns.LookupAddress[],
      family?: number
    ) => void;

    // Override dns.lookup with proper types
    const customLookup: typeof dns.lookup = ((
      hostname: string,
      optionsOrCallback?: dns.LookupOptions | number | LookupCallback,
      maybeCallback?: LookupCallback
    ) => {
      let options: dns.LookupOptions | undefined;
      let callback: LookupCallback | undefined;

      if (typeof optionsOrCallback === 'function') {
        callback = optionsOrCallback;
      } else if (typeof optionsOrCallback === 'object') {
        options = optionsOrCallback;
        callback = maybeCallback;
      } else if (typeof optionsOrCallback === 'number') {
        options = { family: optionsOrCallback };
        callback = maybeCallback;
      }

      if (
        (hostname === 'api.themoviedb.org' ||
          hostname === 'image.tmdb.org' ||
          hostname === 'themoviedb.org') &&
        callback
      ) {
        const cb = callback;
        const all = options?.all;
        return dns.resolve4(hostname, (err, addrs) => {
          if (!err && addrs && addrs.length > 0) {
            if (all) {
              return cb(
                null,
                addrs.map(a => ({ address: a, family: 4 }))
              );
            }
            return cb(null, addrs[0], 4);
          }
          if (options) {
            return origLookup(hostname, options, cb);
          }
          return origLookup(hostname, cb);
        });
      }

      if (callback) {
        if (options) {
          return origLookup(hostname, options, callback);
        }
        return origLookup(hostname, callback);
      }
      return origLookup(hostname, options || {}, () => {});
    }) as typeof dns.lookup;

    dns.lookup = customLookup;
  } catch (e) {
    console.warn('[BakaStream DNS] Failed to set up DNS bypass:', e);
  }
}

// Automatically initialize on server import
setupDnsBypass();
