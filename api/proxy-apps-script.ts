// ───────────────────────────────────────────────────────────────────────
// /api/proxy-apps-script — same-origin relay to the Google Apps Script
// backend (Google Sheets DB API). The admin SPA is a pure Vite app, so in
// production the browser otherwise calls script.google.com directly
// (cross-origin) and hits CORS / PerimeterX / redirect issues ("Failed to
// fetch" / "HTTP 404"). This function does the fetch server-side (Vercel
// edge/node), which follows the Apps Script 302 → script.googleusercontent
// redirect and returns the final JSON to the browser as same-origin.
//
// SECURITY: this is a dumb relay. Auth is enforced by Apps Script itself
// (public actions are public; admin actions require `_token`/`_key`, which
// the client sends and Apps Script validates). No key is read here.
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed", code: 405 });
    return;
  }

  if (!APPS_SCRIPT_URL) {
    res.status(503).json({
      ok: false,
      error: "Apps Script non configuré (GOOGLE_APPS_SCRIPT_URL manquant)",
      code: 503,
    });
    return;
  }

  let body: any;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ ok: false, error: "JSON invalide", code: 400 });
    return;
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body ?? {}),
      redirect: "follow",
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "";

    if (!ct.includes("application/json")) {
      res.status(502).json({
        ok: false,
        error: `Apps Script a répondu en non-JSON (${upstream.status}) — redéployez le Code.gs`,
        code: 502,
      });
      return;
    }

    // Relay the Apps Script JSON: the client parses `{ ok, data }`.
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      res.status(502).json({ ok: false, error: "Apps Script JSON invalide", code: 502 });
      return;
    }
    res.status(200).json(json);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: `Proxy error: ${err?.message || err}`,
      code: 502,
    });
  }
}
