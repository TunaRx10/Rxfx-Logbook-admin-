// ───────────────────────────────────────────────────────────────────────
// /api/admin-ai/status — readiness check for the AI panel.
// Reads server-side envs (NEVER exposed to the browser):
//   - GEMINI_API_KEY (optional)
//   - OPENROUTER_API_KEY (free models via https://openrouter.ai)
// Cached in module memory for 60 s to avoid hammering external uptime checks
// on every chat-panel mount.
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/admin-auth";

let _cache: { value: { ready: boolean; hasGemini: boolean }; ts: number } | null = null;
const TTL_MS = 60 * 1000;

function checkKeys() {
  const hasGemini = !!(process.env.GEMINI_API_KEY);
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY);
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

  const denied = await requireAdmin(req);
  if (denied) {
    res.status(denied.status).json({ error: denied.message });
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
