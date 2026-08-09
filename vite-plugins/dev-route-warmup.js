// ── dev-route-warmup.js ─────────────────────────────────────────────────
//
// Lightweight Vite plugin that pre-warms critical routes a few seconds
// after Vite's dev server is ready. The goal is to pre-resolve each
// route's module graph so the FIRST user navigation to that route hits
// warm deps instead of cold-compiling (TanStack Start has 5-15 s cold
// compile per route on first visit).
//
// Why GET and not HEAD? TanStack Start SSR routes respond with HTML
// body to GET, not HEAD. We don't care about the body — we only want
// Vite to inline-resolve the module graph + the config resolver to
// touch the file. A HEAD that the route doesn't answer falls back to
// GET in HTTP semantics, so we use GET deliberately.
//
// Gating: apply: "serve" makes this plugin a no-op during `vite build`.
// Side effect at build time: nothing — the plugin's `closeBundle` hook
// is intentionally empty (proxy only).
//
// Why HTTP/1.1 + Connection: close? Browsers keep-alive the dev server,
// but Node's default `fetch` might re-use a stale socket if the dev
// server restarts (which a typical code-edit cycle does). Closing after
// each probe ensures we hit the fresh server after the next HMR cycle.
//
// Why `delayMs`? Vite's `serverReady` fires AS SOON AS the first
// request can be served, before route files have been visited by the
// dependency-graph. A 2.5 s sleep lets Vite finish its initial
// optimisation-pass so the warmup benefits from the optimised graph.
//
// Why a single concurrency = 1? Parallel requests just race Vite's
// own module-graph optimiser and can trigger cold re-optimisation on
// some TanStack Start versions. Serial probes are slower wall-clock
// but cheaper on the dev server.

/**
 * @param {{
 *   routes?: Array<{ path: string; label: string }>,
 *   delayMs?: number,
 *   loggerPrefix?: string,
 * }} options
 */
export function devRouteWarmup(options = {}) {
  const routes = options.routes ?? [
    { path: '/', label: 'home' },
    { path: '/dashboard', label: 'dashboard' },
  ];
  const delayMs = options.delayMs ?? 2500;
  const loggerPrefix = options.loggerPrefix ?? '[dev-route-warmup]';

  return {
    name: 'rxfx-dev-route-warmup',
    apply: 'serve', // dev-only — no-op in `vite build`
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          const port = server.config.server.port ?? 5173;
          const host = server.config.server.host ?? '127.0.0.1';
          const baseUrl = `http://${host}:${port}`;
          let completed = 0;
          let failed = 0;

          for (const r of routes) {
            const url = baseUrl + r.path;
            const start = Date.now();
            fetch(url, {
              method: 'GET',
              headers: { Connection: 'close', 'User-Agent': 'rxfx-dev-warmup/1.0' },
              signal: AbortSignal.timeout(8000),
            })
              .then((res) => {
                const ms = Date.now() - start;
                if (res.ok || res.status === 304) {
                  completed++;
                  console.log(
                    `${loggerPrefix} ✓ ${r.label.padEnd(14)} ${url} (${res.status}, ${ms}ms)`,
                  );
                } else {
                  failed++;
                  console.warn(
                    `${loggerPrefix} ✗ ${r.label.padEnd(14)} ${url} (${res.status}, ${ms}ms)`,
                  );
                }
              })
              .catch((err) => {
                failed++;
                console.warn(
                  `${loggerPrefix} ✗ ${r.label.padEnd(14)} ${url} (${err?.message ?? err})`,
                );
              });
          }

          // Print a summary line after all fetches had a chance to settle.
          // 8 s timeout per fetch + 1 s margin = 9 s.
          // Derive summary delay from timeout + 1s margin so the two
          // never drift if TIMEOUT_MS is ever tuned.
          setTimeout(() => {
            const total = routes.length;
            console.log(
              `${loggerPrefix} done — ${completed}/${total} ok, ${failed}/${total} failed (delay=${delayMs}ms)`,
            );
          }, 8000 + 1000);
        }, delayMs);
      });
    },
  };
}
