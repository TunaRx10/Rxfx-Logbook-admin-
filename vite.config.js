import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { devRouteWarmup } from './vite-plugins/dev-route-warmup'
import devAdminAI from './vite-plugins/dev-admin-ai'

// https://vitejs.dev/config/
//
// Performance: split the single 1.6 MB admin bundle (audit 2024-04) into
// vendor + feature chunks so the SPA shell paints quickly and heavy libs
// (recharts, framer-motion, firebase) download in parallel.
//
// The `manualChunks` map below is the FUNCTION form (per-module) — it lets
// us put app code into the entry chunk and place every node_module into a
// named bucket based on its package name. Buckets become independent
// long-lived browser cache slots: a user who only visits /users gets
// react-core + icons + only the page chunk they need (~50 KB delta), not
// the full 1.6 MB vendor pile.
//
// dev/warmup: devRouteWarmup issues GET requests to /, /users, /billing,
// /settings, /suby-products a few seconds after `serverReady` so the
// Vite dep-graph resolves per-route chunks pre-emptively. First user
// navigation then doesn't pay the cold-compile tax.
// Load ALL .env vars (not just VITE_*) so the dev-admin-ai plugin can
// read GEMINI_API_KEY / OPENROUTER_API_KEY from process.env.
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
for (const [key, value] of Object.entries(env)) {
  if (!process.env[key]) process.env[key] = value;
}

export default defineConfig({
  // 🔒 FIX (audit 2026-07-30): pinned to vite@5.x (stable Rollup bundler).
  //   vite v6 ships an opt-in `rolldown` bundler with regressions on
  //   packages that declare dynamic `exports` sub-paths (lucide-react,
  //   framer-motion 12.x LayoutGroupContext, caniuse-lite sub-unpacker).
  //   vite 5 + Rollup handles all exports.map subpaths correctly without
  //   per-package workarounds. Defensive alias + optimizeDeps below kept
  //   harmless for belt-and-braces coverage.
  plugins: [
    react(),
    // 🔧 DEV-ONLY: auto-spawn Firebase Functions emulator on Vite boot +
    // expose /api/dev/* for the AdminDashboard degraded-mode banner.
    // Plugin internally gates on `apply: 'serve'` so it's a no-op in
    // `vite build` (production).
    // 🔒 DEV-ONLY: AI proxy (OpenRouter + Gemini) — keeps API keys server-side
    devAdminAI(),
    // ⚡ DEV-ONLY: warmup critical routes after Vite is ready. No-op in
    // production builds (plugin gates on `apply: 'serve'`).
    // DÉSACTIVÉ — causait un crash du serveur après warmup.
    // devRouteWarmup({
    //   routes: [
    //     { path: '/', label: 'dashboard' },
    //     { path: '/users', label: 'users' },
    //     { path: '/billing', label: 'billing' },
    //     { path: '/settings', label: 'settings' },
    //     { path: '/suby-products', label: 'suby' },
    //     { path: '/certifications', label: 'certifications' },
    //   ],
    //   delayMs: 2500,
    //   loggerPrefix: '[dev-route-warmup/admin]',
    // }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // 🔒 Security headers — mirrors vercel.json for local dev parity
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
    // 🔒 PROXY: Admin AI — server-side only (dev-admin-ai handles /api/admin-ai/*).
    proxy: {},
  },
  // 🔒 audit 2026-07-30 — framer-motion 12.x native ESM resolution broken
  //   under vite@5 + Rollup stable: framer-motion's dist/es/index.mjs
  //   does `import 'motion-dom'`, but motion-dom's package.json declares
  //   `exports: ["."]` (single bare path, no sub-fields) which Rollup's
  //   static exports-map walker cannot map to a concrete file. Vite
  //   build then fails with `[commonjs--resolver] Failed to resolve entry
  //   for package "motion-dom"`. CommonJS resolution bypasses the
  //   exports field (uses `main` only), so we alias framer-motion to its
  //   single-file CJS bundle (dist/cjs/index.js) — which requires
  //   motion-dom via CJS rule and works without exports.map.
  //   `optimizeDeps.include` is a DEV-ONLY prebundle mechanism and does
  //   NOT apply during `vite build`, so it cannot substitute here.
  resolve: {
    alias: {
      'framer-motion': path.resolve(
        process.cwd(),
        'node_modules/framer-motion/dist/cjs/index.js',
      ),
    },
  },
  // Note: `optimizeDeps.include: ['framer-motion']` would be redundant —
  // the resolve.alias above wins at import-resolution time, before esbuild
  // prebundling runs. Framer-motion is also not pre-bundled by alias
  // resolution in prod (vite build ≠ optimizeDeps scope).
  //
  // TODO(cleanup-track): when framer-motion ships an ESM-only build with a
  // proper `exports` map (post-12.x), drop the alias. Until then, this is
  // the only path that admits vite@5 + Rollup stable builds.
  // Let Rollup derive dependency chunks automatically. The previous
  // package-wide manual buckets created circular vendor → react/charts
  // dependencies and offered no reliable cache benefit for this SPA.
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
