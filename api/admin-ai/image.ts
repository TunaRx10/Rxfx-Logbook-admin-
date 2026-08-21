// ───────────────────────────────────────────────────────────────────────
// /api/admin-ai/image — image generation proxy.
// Uses Gemini (gemini-2.0-flash-exp-image-generation for free preview)
// when a prompt is sent. Returns { url: dataUrl } or { urls: [...] }.
// Falls back to OpenRouter vision model placeholder if no Gemini key.
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/admin-auth.js";

type Body = { prompt: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const denied = await requireAdmin(req);
  if (denied) {
    res.status(denied.status).json({ error: denied.message });
    return;
  }

  let body: Body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  if (!body?.prompt || typeof body.prompt !== "string" || body.prompt.length < 3) {
    res.status(400).json({ error: "prompt must be a non-empty string" });
    return;
  }

  if (!(process.env.GEMINI_API_KEY)) {
    res.status(503).json({
      error: "Image generation unavailable — GEMINI_API_KEY not configured",
    });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent("gemini-2.0-flash-exp") +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: body.prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!upstream.ok) {
    const txt = await upstream.text().catch(() => "");
    res.status(upstream.status).json({
      error: `Gemini image upstream error (${upstream.status})`,
      detail: txt.slice(0, 500),
    });
    return;
  }

  const data: any = await upstream.json().catch(() => null);
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const inlineImage = parts.find((p: any) => p.inlineData);
  if (inlineImage?.inlineData?.data) {
    const mime = inlineImage.inlineData.mimeType || "image/png";
    const dataUrl = `data:${mime};base64,${inlineImage.inlineData.data}`;
    res.status(200).json({ url: dataUrl, mime });
    return;
  }
  const text = parts.find((p: any) => p.text)?.text;
  if (text) {
    res.status(200).json({ text });
    return;
  }
  res.status(502).json({ error: "No image in upstream response", raw: data });
}
