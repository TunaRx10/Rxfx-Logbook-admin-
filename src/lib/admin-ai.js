/**
 * RxFx Admin — AI Generation Utilities
 *
 * 🔒 SECURITY: All AI calls go through the server-side proxy /api/admin-ai.
 * The OpenRouter and Gemini API keys are NEVER exposed to the client.
 * The client only sees the proxy URL, not the keys.
 *
 * Available models via OpenRouter (free tier).
 */

import { useEffect, useState } from "react";
import { getStoredSession } from "./apps-script-auth";

const AI_PROXY = "/api/admin-ai";

/** En-têtes communs : token de session admin en Authorization: Bearer. */
function authHeaders(extra = {}) {
  const session = getStoredSession();
  const headers = { "Content-Type": "application/json", ...extra };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  return headers;
}

/**
 * Modèles disponibles — ordre de cascade : Gemini (défaut) → Mistral → OpenRouter.
 * Les clés sont lues côté serveur (proxy /api/admin-ai), jamais dans le bundle.
 */
export const FREE_MODELS = [
  {
    id: "google/gemini-flash-latest",
    name: "Gemini Flash",
    provider: "Google",
    icon: "🌐",
    desc: "Défaut · Rapide · Multilingue · Vision",
    best: true,
  },
  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    name: "Mistral Small 3.2",
    provider: "Mistral",
    icon: "🌪️",
    desc: "Fallback · 24B · 256K contexte",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron Ultra",
    provider: "NVIDIA",
    icon: "⚡",
    desc: "Raisonnement · 1M contexte · MoE 550B",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    provider: "OpenAI",
    icon: "🤖",
    desc: "Rapide · Coding · 131K contexte",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "Google",
    icon: "🧠",
    desc: "Chat général · 262K contexte · Vision",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Laguna S 2.1",
    provider: "Poolside",
    icon: "💻",
    desc: "Code · Agent · 262K contexte",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "North Mini Code",
    provider: "Cohere",
    icon: "⌨️",
    desc: "Code génération · 256K contexte",
  },
  {
    id: "openrouter/free",
    name: "Auto (cascade)",
    provider: "OpenRouter",
    icon: "🎲",
    desc: "Cascade Gemini → Mistral → OpenRouter",
  },
];

export const DEFAULT_MODEL = "google/gemini-flash-latest";

let _aiStatus = null;
let _hasGemini = false;
let _statusPromise = null;

async function checkStatus() {
  // Source unique de vérité : un seul fetch /status partagé par
  // isAIReady(), refreshAIStatus() et le hook useAIStatus().
  if (!_statusPromise) {
    _statusPromise = (async () => {
      try {
        const res = await fetch(AI_PROXY + "/status", { headers: authHeaders() });
        const data = await res.json();
        _aiStatus = Boolean(data.ready);
        _hasGemini = Boolean(data.hasGemini);
      } catch {
        _aiStatus = false;
        _hasGemini = false;
      }
      return _aiStatus;
    })();
  }
  return _statusPromise;
}

/** Check if AI is ready (auto-checks on first call, cached after) */
export async function isAIReady() {
  if (_aiStatus !== null) return _aiStatus;
  return checkStatus();
}

/**
 * Synchronous check for initial render.
 * Returns true if status hasn't been checked yet (optimistic) or if AI is confirmed ready.
 */
export function isChatReady() {
  return _aiStatus !== false;
}

/**
 * React hook — remplace les appels `isGeminiReady()` (Promise) buggés.
 * Récupère le statut du proxy AI via checkStatus() (source unique) et
 * expose des booléens synchrones : { chatReady, hasGemini }.
 */
export function useAIStatus() {
  const [state, setState] = useState({ chatReady: _aiStatus !== false, hasGemini: _hasGemini });

  useEffect(() => {
    let active = true;
    checkStatus().then(() => {
      if (active) setState({ chatReady: _aiStatus, hasGemini: _hasGemini });
    });
    return () => { active = false; };
  }, []);

  return state;
}

/** Force a re-check of AI status (call after config changes) */
export async function refreshAIStatus() {
  _aiStatus = null;
  _hasGemini = false;
  _statusPromise = null;
  return checkStatus();
}

export function getAvailableModels() {
  return FREE_MODELS;
}

/**
 * Streaming chat with OpenRouter via proxy.
 */
export async function openRouterChat(messages, { signal, stream = false, model } = {}) {
  const res = await fetch(`${AI_PROXY}/chat`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ messages, model: model || DEFAULT_MODEL, stream }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (stream) return res.body;
  return res.json();
}

/**
 * Generate image via Gemini (proxy).
 */
export async function generateImage(prompt) {
  const res = await fetch(`${AI_PROXY}/image`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Generic AI generation (Gemini first, OpenRouter fallback).
 */
export async function generateWithAI(prompt) {
  const res = await fetch(`${AI_PROXY}/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

/** Content generators (unchanged logic, now via proxy) */
export async function generateEmail(prompt) {
  const fullPrompt = `Tu es un expert en marketing email pour une plateforme de trading professionnelle appelée RxFx Logbook. Génère un email marketing premium au format HTML. Retourne UNIQUEMENT un objet JSON valide avec ce format exact : { "subject": "...", "body": "<div style='...'>HTML</div>" }. Contexte : ${prompt}`;
  const text = await generateWithAI(fullPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Réponse AI invalide");
  return JSON.parse(jsonMatch[0]);
}

export async function generateCampaign(prompt) {
  const fullPrompt = `Tu es un expert en growth marketing. Génère les détails d'une campagne. Retourne UNIQUEMENT un JSON : { "title": "...", "description": "...", "type": "campaign|event|promotion|signal|announcement", "location": "...", "link": "..." }. Contexte : ${prompt}`;
  const text = await generateWithAI(fullPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Réponse AI invalide");
  return JSON.parse(jsonMatch[0]);
}

export async function generateProduct(prompt) {
  const fullPrompt = `Tu es un expert e-commerce trading. Génère une fiche produit. Retourne UNIQUEMENT un JSON : { "name": "...", "description": "...", "price": 49.99, "category": "formation|indicator|ea|template|signal|coaching|other", "features": ["..."] }. Contexte : ${prompt}`;
  const text = await generateWithAI(fullPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Réponse AI invalide");
  return JSON.parse(jsonMatch[0]);
}
