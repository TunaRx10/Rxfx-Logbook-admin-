/**
 * Vite Dev Plugin: Admin AI Proxy
 *
 * 🔒 SECURITY: All AI API calls run server-side. The Gemini, Mistral and
 * OpenRouter API keys are read from Supabase `system_config` (service_role)
 * with a fallback to process.env — they NEVER reach the client bundle.
 *
 * Fournisseurs (ordre de cascade par défaut) :
 *   1. Gemini (natif, API Google AI Studio) — modèle par défaut
 *   2. Mistral (clé native si présente, sinon via OpenRouter)
 *   3. OpenRouter (modèles gratuits)
 *
 * Endpoints:
 *   POST /api/admin-ai/chat      — chat (streaming SSE)
 *   POST /api/admin-ai/image     — Gemini image generation
 *   POST /api/admin-ai/generate  — génération texte générique (Gemini → OR)
 *   GET  /api/admin-ai/status    — Check if AI is configured
 */

// ── Lecture des clés : Supabase system_config → fallback .env ──
let _supabaseConfigPromise = null;
let _supabaseConfigCache = null;
let _supabaseConfigAt = 0;
const CONFIG_TTL_MS = 60_000;

function getSupabaseConfig() {
  // Mémoïse la promesse (et non juste le résultat) : les appels parallèles
  // de /status ne déclenchent qu'UN seul fetch Supabase. Cache TTL 60s.
  if (_supabaseConfigCache && Date.now() - _supabaseConfigAt < CONFIG_TTL_MS) {
    return Promise.resolve(_supabaseConfigCache);
  }
  if (!_supabaseConfigPromise) {
    _supabaseConfigPromise = (async () => {
      const url = process.env.SUPABASE_URL || "";
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (!url || !key) return {};
      try {
        const res = await fetch(
          `${url}/rest/v1/system_config?select=key,value`,
          {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (!res.ok) return {};
        const rows = await res.json();
        const map = {};
        for (const row of rows || []) if (row?.key) map[row.key] = row.value;
        _supabaseConfigCache = map;
        _supabaseConfigAt = Date.now();
        return map;
      } catch {
        return {};
      } finally {
        _supabaseConfigPromise = null;
      }
    })();
  }
  return _supabaseConfigPromise;
}

async function getConfigValue(key) {
  const cfg = await getSupabaseConfig();
  if (cfg && cfg[key]) return cfg[key];
  return "";
}

async function getGeminiKey() {
  const fromDb = await getConfigValue("ai_gemini_key");
  if (fromDb) return fromDb;
  return process.env.GEMINI_API_KEY || "";
}

async function getMistralKey() {
  const fromDb = await getConfigValue("ai_mistral_key");
  if (fromDb) return fromDb;
  return process.env.MISTRAL_API_KEY || "";
}

async function getOpenRouterKey() {
  const fromDb = await getConfigValue("ai_openrouter_key");
  if (fromDb) return fromDb;
  return process.env.OPENROUTER_API_KEY || "";
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
// ⚠️ L'alias "latest" est le SEUL modèle Gemini accepté par les clés
// gratuites (les versions épinglées 2.0/2.5 renvoient 429/404).
const GEMINI_MODEL = "gemini-flash-latest";
const MISTRAL_OR_MODEL = "mistralai/mistral-small-3.2-24b-instruct";

// ── OpenRouter ──
async function openRouterChat({ messages, model, stream }) {
  const apiKey = await getOpenRouterKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://rxfx.app",
      "X-Title": "RxFx Admin",
    },
    body: JSON.stringify({
      model: model || "openrouter/free",
      messages,
      stream: stream || false,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter ${res.status}`);
  }

  return res;
}

// ── Gemini natif (chat + streaming SSE au format client) ──
async function geminiChatStream({ messages, stream }, writeChunk, finish) {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const systemMsg = messages.find((m) => m.role === "system");
  const history = messages
    .filter((m) => m.role !== "system" && m.role !== "model")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "" }],
    }));
  const lastUser = history.pop() || { role: "user", parts: [{ text: "" }] };

  const chat = model.startChat({
    history,
    systemInstruction: systemMsg
      ? { parts: [{ text: systemMsg.content || "" }] }
      : undefined,
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
  });

  if (!stream) {
    const result = await chat.sendMessage(lastUser.parts);
    const text = result.response.text();
    finish(text);
    return;
  }

  // Streaming : réémettre en SSE au format OpenRouter (data: {choices:[...]})
  const result = await chat.sendMessageStream(lastUser.parts);
  let full = "";
  for await (const chunk of result.stream) {
    const delta = chunk.text();
    if (!delta) continue;
    full += delta;
    writeChunk({
      choices: [
        {
          delta: { role: "assistant", content: delta },
          finish_reason: null,
        },
      ],
    });
  }
  writeChunk({ choices: [{ delta: { content: "" }, finish_reason: "stop" }] });
  writeChunk(null); // [DONE]
}

// ── Mistral (natif si clé, sinon via OpenRouter) ──
async function mistralChat({ messages, model, stream }) {
  const nativeKey = await getMistralKey();
  if (nativeKey) {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nativeKey}`,
      },
      body: JSON.stringify({
        model: model || "mistral-small-latest",
        messages,
        stream: stream || false,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Mistral ${res.status}`);
    }
    return res;
  }
  // Fallback : modèle Mistral servi par OpenRouter
  return openRouterChat({ messages, model: MISTRAL_OR_MODEL, stream });
}

// ── Génération image Gemini ──
async function generateImage(prompt) {
  const key = await getGeminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(key);
  // L'alias "latest" est le seul accepté par les clés gratuites ; le modèle
  // d'image dédié peut renvoyer 429 → le client retombe sur OpenRouter.
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: { responseModalities: ["Text", "Image"] },
  });

  const fullPrompt = `Crée une image de haute qualité, style professionnel et premium, pour une plateforme de trading : ${prompt}. L'image doit être moderne, sombre (dark theme), avec des accents cyan/orangé. Format 16:9.`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts || [];
  const images = [];

  for (const part of parts) {
    if (part.inlineData) {
      images.push({
        dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        mimeType: part.inlineData.mimeType,
      });
    }
  }

  if (images.length === 0) {
    const text = response.text();
    const base64Match = text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
    if (base64Match) images.push({ dataUrl: base64Match[0], mimeType: "image/png" });
  }

  return { images, text: response.text() };
}

// ── Génération texte générique (Gemini → OpenRouter) ──
async function generateWithAI(prompt) {
  const geminiKey = await getGeminiKey();
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.warn("[admin-ai-proxy] Gemini failed, falling back to OpenRouter:", e.message);
    }
  }

  const orKey = await getOpenRouterKey();
  if (!orKey) throw new Error("No AI keys configured");

  const res = await openRouterChat({
    messages: [{ role: "user", content: prompt }],
    stream: false,
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export default function devAdminAIProxy() {
  return {
    name: "dev-admin-ai-proxy",
    configureServer(server) {
      console.log(
        "[dev-admin-ai-proxy] ✅ Activated — AI proxy at /api/admin-ai (Gemini → Mistral → OpenRouter)",
      );

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/admin-ai")) return next();

        // CORS headers for dev
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // GET /api/admin-ai/status
        if (req.method === "GET" && req.url === "/api/admin-ai/status") {
          const [gemini, mistral, openrouter] = await Promise.all([
            getGeminiKey(),
            getMistralKey(),
            getOpenRouterKey(),
          ]);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ready: Boolean(gemini || mistral || openrouter),
            hasGemini: Boolean(gemini),
            hasMistral: Boolean(mistral),
            hasOpenRouter: Boolean(openrouter),
            defaultProvider: gemini ? "gemini" : mistral ? "mistral" : openrouter ? "openrouter" : "none",
          }));
          return;
        }

        // POST /api/admin-ai/chat (streaming)
        if (req.method === "POST" && req.url === "/api/admin-ai/chat") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", async () => {
            try {
              const { messages, model, stream } = JSON.parse(body);
              const wanted = (model || "").toLowerCase();
              const isGemini = wanted.startsWith("google/gemini") || wanted.startsWith("gemini");
              const isMistral = wanted.startsWith("mistralai/") || wanted.startsWith("mistral");
              const isAuto = !wanted || wanted === "openrouter/free" || wanted === "auto";

              const sendSSE = (payload) => {
                if (payload === null) {
                  res.write("data: [DONE]\n\n");
                  res.end();
                  return;
                }
                res.write(`data: ${JSON.stringify(payload)}\n\n`);
              };

              // 🔒 Si la réponse a déjà commencé (headers SSE envoyés) et que le
              // fournisseur suivant échoue, on ne peut plus faire writeHead →
              // on termine proprement en SSE avec un événement d'erreur.
              const startSSE = () => {
                if (res.headersSent) return;
                res.writeHead(200, {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                });
              };
              const endJSON = (obj) => {
                if (res.headersSent) {
                  // Headers déjà écrits (stream avorté) → message SSE
                  res.write(`data: ${JSON.stringify(obj)}\n\n`);
                  res.end();
                  return;
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(obj));
              };

              // Stratégie : Gemini par défaut, puis Mistral, puis OpenRouter
              if (isGemini || (isAuto && (await getGeminiKey()))) {
                try {
                  if (stream !== false) {
                    startSSE();
                    await geminiChatStream(
                      { messages, stream: true },
                      (chunk) => {
                        if (!res.headersSent) startSSE();
                        sendSSE(chunk); // null → [DONE] + end()
                      },
                      () => { /* unused en streaming */ },
                    );
                  } else {
                    await geminiChatStream(
                      { messages, stream: false },
                      () => { /* unused */ },
                      (text) => {
                        endJSON({ choices: [{ message: { role: "assistant", content: text } }] });
                      },
                    );
                  }
                  return;
                } catch (geminiErr) {
                  console.warn("[admin-ai-proxy] Gemini failed, falling back:", geminiErr.message);
                  // Continue vers Mistral / OpenRouter — si des headers SSE ont
                  // déjà été envoyés, le fallback streamera dans la même réponse.
                }
              }

              if (isMistral || (isAuto && (await getMistralKey()))) {
                try {
                  const response = await mistralChat({ messages, model: isMistral ? model : undefined, stream: stream !== false });
                  if (stream !== false) {
                    startSSE();
                    const reader = response.body.getReader();
                    const pump = async () => {
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) { res.end(); break; }
                        if (!res.headersSent) startSSE();
                        res.write(value);
                      }
                    };
                    pump();
                  } else {
                    const data = await response.json();
                    endJSON(data);
                  }
                  return;
                } catch (mistralErr) {
                  console.warn("[admin-ai-proxy] Mistral failed, falling back:", mistralErr.message);
                }
              }

              // Fallback OpenRouter
              const response = await openRouterChat({
                messages,
                model: isGemini || isMistral ? "openrouter/free" : model || "openrouter/free",
                stream: stream !== false,
              });
              if (stream !== false) {
                startSSE();
                const reader = response.body.getReader();
                const pump = async () => {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) { res.end(); break; }
                    if (!res.headersSent) startSSE();
                    res.write(value);
                  }
                };
                pump();
              } else {
                const data = await response.json();
                endJSON(data);
              }
            } catch (err) {
              if (res.headersSent) {
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.end();
              } else {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
              }
            }
          });
          return;
        }

        // POST /api/admin-ai/image
        if (req.method === "POST" && req.url === "/api/admin-ai/image") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", async () => {
            try {
              const { prompt } = JSON.parse(body);
              const result = await generateImage(prompt);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // POST /api/admin-ai/generate
        if (req.method === "POST" && req.url === "/api/admin-ai/generate") {
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", async () => {
            try {
              const { prompt } = JSON.parse(body);
              const text = await generateWithAI(prompt);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ text }));
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
