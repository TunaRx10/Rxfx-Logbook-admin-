// ───────────────────────────────────────────────────────────────────────
// /api/admin-ai/chat — proxy to OpenRouter (free models first) and
// optionally Gemini. Streams tokens when `stream: true`, otherwise
// returns the full completion as JSON.
//
// SECURITY: this file is server-only. API keys are read from process.env
// and NEVER serialized into the response beyond the AI text itself.
// ───────────────────────────────────────────────────────────────────────

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/admin-auth";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Body = {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  systemPrompt?: string;
  maxTokens?: number;
};

const DEFAULT_MODEL = "openrouter/free";

async function callOpenRouter(body: Body) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");
  // Inject a systemPrompt prefix if provided
  const messages = body.systemPrompt
    ? [{ role: "system" as const, content: body.systemPrompt }, ...body.messages]
    : body.messages;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://rxfx.io/admin",
      "X-Title": "RxFx Admin",
    },
    body: JSON.stringify({
      model: body.model || DEFAULT_MODEL,
      messages,
      stream: !!body.stream,
      max_tokens: body.maxTokens ?? 1024,
      temperature: 0.7,
    }),
  });
  return res;
}

async function callGemini(body: Body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const sys = body.systemPrompt || "";
  const contents = body.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
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
      contents,
      generationConfig: { maxOutputTokens: body.maxTokens ?? 1024, temperature: 0.7 },
    }),
  });
  return res;
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

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "messages[] is required" });
    return;
  }

  // Cascade: try Gemini (if a model hints Gemini) else OpenRouter/OpenRouter-free
  const hasGemini = !!(process.env.GEMINI_API_KEY);
  const modelLooksGemini =
    !!body.model && (body.model.includes("gemini") || body.model.startsWith("google/"));

  // PATH A: caller wants Gemini explicitly AND we have the key → call Gemini.
  if (modelLooksGemini && hasGemini) {
    const upstream = await callGemini(body);
    if (upstream.ok) return await relayResponse(upstream, body.stream === true, res);
    const txt = await upstream.text().catch(() => "");
    res.status(upstream.status).json({ error: `Upstream error (${upstream.status})`, detail: txt.slice(0, 500) });
    return;
  }

  // PATH B: OpenRouter with fallback chain.
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENROUTER_API_KEY not configured" });
    return;
  }
  const maxTokens = Math.max(body.maxTokens ?? 256, 64);
  const sysMsg = body.systemPrompt
    ? [{ role: "system" as const, content: body.systemPrompt }]
    : [];
  const allMessages: ChatMessage[] = [...sysMsg, ...body.messages];

  // Caller's chosen model first (if it isn't Gemini-only), then a cascade of
  // robust free models (some routes/auto-selectors return empty).
  const primary = body.model && !modelLooksGemini && body.model !== DEFAULT_MODEL
    ? body.model
    : DEFAULT_MODEL;
  const cascade = Array.from(
    new Set([
      primary,
      "openrouter/free",
      "qwen/qwen-2.5-72b-instruct:free",
      "mistralai/mistral-small-3.2-24b-instruct:free",
      "meta-llama/llama-3.1-8b-instruct:free",
      "google/gemma-4-31b-it:free",
    ]),
  );

  const wantStream = body.stream === true;

  for (const model of cascade) {
    if (wantStream) {
      // Streaming: the client parses SSE `data: {choices:[{delta:{content}}]}`
      // lines. We fetch OpenRouter with stream:true and relay the raw SSE body
      // untouched — the exact same shape the client already expects.
      const upstream = await fetchOpenRouter(apiKey, model, allMessages, maxTokens, true);
      if (!upstream.ok) {
        console.warn(`[chat] ${model} stream → ${upstream.status}, trying next…`);
        continue;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-store");
      if (upstream.body) {
        const reader = upstream.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(Buffer.from(value));
          }
        };
        try {
          await pump();
        } catch {
          res.end();
        }
      } else {
        res.end();
      }
      return;
    }

    const text = await tryOpenRouterModel(apiKey, model, allMessages, maxTokens);
    if (text) {
      res.status(200).json({ text });
      return;
    }
    console.warn(`[chat] ${model} returned no content, trying next…`);
  }
  res.status(502).json({
    error: "All OpenRouter models in cascade returned empty",
    attempt: cascade,
  });
  return;
}

// Fetch OpenRouter with an explicit stream flag. Returns the raw Response.
async function fetchOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  stream: boolean,
): Promise<Response> {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://rxfx.io/admin",
      "X-Title": "RxFx Admin",
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
}

// Try a single model via OpenRouter (non-streaming). Returns parsed text or null.
async function tryOpenRouterModel(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string | null> {
  const res = await fetchOpenRouter(apiKey, model, messages, maxTokens, false);
  if (!res.ok) return null;
  const json: any = await res.json().catch(() => null);
  const text = json?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
}

async function relayResponse(upstream: Response, stream: boolean, res: VercelResponse) {
  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store");
    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(Buffer.from(value));
        }
      };
      try {
        await pump();
      } catch (err) {
        res.end();
      }
    } else {
      res.end();
    }
    return;
  }
  const data = await upstream.json().catch(() => null);
  if (!data) {
    res.status(502).json({ error: "Bad upstream JSON" });
    return;
  }
  // Normalize Gemini vs OpenRouter response
  const textFromOpenRouter: string | undefined = data?.choices?.[0]?.message?.content;
  const textFromGemini: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const text = (textFromOpenRouter ?? textFromGemini ?? "").trim();
  res.status(200).json({ text, raw: undefined });
  return;
}
