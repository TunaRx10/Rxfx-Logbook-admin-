/**
 * Google API — envoi d'emails via Apps Script (nouveau protocole)
 * ================================================================
 * Le backend de données est désormais le Code.gs (`google-sheets-db/Code.gs`).
 * Ce module expose l'envoi d'emails individuels et groupés en utilisant
 * l'action `sendEmail` du script (file d'attente `mail_queue` + Gmail).
 *
 * Env vars :
 *   VITE_GOOGLE_APPS_SCRIPT_URL — URL de déploiement `/exec`
 *
 * Auth : token de session admin (`payload._token`). Aucune clé API statique
 * n'est exposée au client.
 */

import { getStoredSession } from "./apps-script-auth";

const APPS_SCRIPT_URL_RAW = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

// En dev (localhost), on passe par le proxy Vite pour contourner CORS.
// En prod, on parle directement à Apps Script.
function proxiedAppsScriptUrl() {
  if (typeof window === "undefined") return APPS_SCRIPT_URL_RAW;
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return APPS_SCRIPT_URL_RAW.replace(
      /^https:\/\/script\.google\.com/,
      `${origin}/__proxy_apps_script`,
    );
  }
  return APPS_SCRIPT_URL_RAW;
}

const APPS_SCRIPT_URL = proxiedAppsScriptUrl();

/** Check si le backend Apps Script est disponible. */
export function isSheetsAvailable() {
  return !!APPS_SCRIPT_URL_RAW;
}

async function postToAppsScript(action, payload = {}) {
  if (!APPS_SCRIPT_URL_RAW) {
    throw new Error("VITE_GOOGLE_APPS_SCRIPT_URL non configuré");
  }
  const session = getStoredSession();
  if (session?.token) payload._token = session.token;
  // Content-Type: text/plain → pas de preflight CORS, Apps Script parse
  // quand même le body via JSON.parse(e.postData.contents).
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("Apps Script non déployé — l'URL répond en HTML au lieu de JSON. Redéployez le Code.gs.");
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur Apps Script");
  return json.data;
}

/**
 * Envoie un email via l'action `sendEmail` du script (file d'attente + Gmail).
 * @param {string} to - destinataire
 * @param {string} subject
 * @param {string} body - HTML
 * @returns {Promise<{ok: boolean}>}
 */
export async function sendEmail(to, subject, body) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré — impossible d'envoyer un email");
  }
  const result = await postToAppsScript("sendEmail", { to, subject, bodyHtml: body });
  return { ok: result && result.ok !== false };
}

/**
 * Envoi groupé (boucle sur `sendEmail`).
 * @param {Array<{to: string, subject: string, body: string}>} recipients
 * @returns {Promise<{ok: boolean, sent: number, failed: number}>}
 */
export async function sendBulkEmail(recipients) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  let sent = 0;
  let failed = 0;
  for (const r of recipients || []) {
    try {
      await sendEmail(r.to, r.subject, r.body);
      sent++;
    } catch (err) {
      console.warn("[google-api] bulk send failed for", r.to, err);
      failed++;
    }
  }
  return { ok: true, sent, failed };
}
