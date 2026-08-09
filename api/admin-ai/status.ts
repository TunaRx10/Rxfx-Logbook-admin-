// ───────────────────────────────────────────────────────────────────────
// /api/admin-ai/status — readiness check for the AI panel.
// Reads server-side envs (NEVER exposed to the browser):
//   - GEMINI_API_KEY (optional)
//   - OPENROUTER_API_KEY (free models via https://openrouter.ai)
// Cached in module memory for 60 s to avoid hammering external uptime checks
// on every chat-panel mount.
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";

let _cache: { value: { ready: boolean; hasGemini: boolean }; ts: number } | null = null;
const TTL_MS = 60 * 1000;

function checkKeys() {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY);
  return {
    ready: hasGemini || hasOpenRouter,
    hasGemini,
    hasOpenRouter,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  if (_cache && Date.now() - _cache.ts < TTL_MS) {
    res.status(200).json(_cache.value);
    return;
  }
  const value = checkKeys();
  _cache = { value, ts: Date.now() };
  res.status(200).json(value);
}
