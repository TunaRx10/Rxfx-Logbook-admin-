// ───────────────────────────────────────────────────────────────────────
// /api/admin-ai/generate — generic, single-prompt generation.
// Cascade priority: Gemini → Mistral → OpenRouter auto.
// Used by content generators in admin-ai.js (generateEmail, etc).
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/admin-auth";

type Body = { prompt: string; systemPrompt?: string; maxTokens?: number };

async function tryGemini(prompt: string, sys: string, maxTokens: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent("gemini-flash-latest") +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json().catch(() => null);
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function tryOpenRouter(prompt: string, sys: string, maxTokens: number) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  // OpenRouter's "openrouter/free" is an auto-router that picks a currently-
  // available free model — robust against per-model deprecation.
  const cascade = [
    "openrouter/free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ];
  for (const model of cascade) {
    const messages = sys
      ? [{ role: "system" as const, content: sys }, { role: "user" as const, content: prompt }]
      : [{ role: "user" as const, content: prompt }];
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rxfx.io/admin",
        "X-Title": "RxFx Admin",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
    });
    if (!res.ok) {
      // Try to extract an error message to surface in logs
      try {
        const err = await res.json().catch(() => null);
        console.warn(`[generate] ${model} → ${res.status}:`, err?.error?.message || err);
      } catch {
        /* ignore */
      }
      continue;
    }
    const json: any = await res.json().catch(() => null);
    const text = json?.choices?.[0]?.message?.content;
    if (text) return text;
  }
  return null;
}

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

  if (!body?.prompt || typeof body.prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const sys = body.systemPrompt || "";
  const maxTokens = body.maxTokens ?? 1024;

  // Try Gemini first if configured
  let text = await tryGemini(body.prompt, sys, maxTokens);
  if (!text) text = await tryOpenRouter(body.prompt, sys, maxTokens);
  if (!text) {
    res.status(503).json({
      error: "No provider succeeded (GEMINI_API_KEY or OPENROUTER_API_KEY required)",
    });
    return;
  }
  res.status(200).json({ text: text.trim() });
}
