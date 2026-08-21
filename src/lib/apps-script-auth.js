/**
 * RxFx Admin — Authentification via Apps Script
 * =============================================
 * Remplace Supabase Auth par les actions `register` / `login` / `logout` /
 * `getCurrentUser` du Code.gs (Google Sheets Database API).
 *
 * Protocole : POST `{ action, payload }` vers l'URL `VITE_GOOGLE_APPS_SCRIPT_URL`.
 * Le token de session est envoyé dans `payload._token` (lu par `authenticate_`
 * du script), et NON via `?key=`, pour que `auth.user` soit correctement
 * résolu (la clé API forcerait `auth.apiKey` au lieu de la session).
 *
 * Les actions `login`/`register`/`logout` sont publiques côté script
 * (`PUBLIC_ACTIONS`) : aucune clé n'est requise.
 */

const APPS_SCRIPT_URL_RAW = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

// En dev (localhost) : reverse-proxy via Vite pour contourner CORS /
// COEP / CORP. En prod : appel direct.
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

const TOKEN_KEY = "rxfx_admin_token";
const USER_KEY = "rxfx_admin_user";

/** True quand l'URL Apps Script est configurée (backend d'auth disponible). */
export function isAuthConfigured() {
  return !!APPS_SCRIPT_URL_RAW;
}

async function post(action, payload = {}) {
  if (!APPS_SCRIPT_URL_RAW) {
    throw new Error(
      "Apps Script non configuré. Définissez VITE_GOOGLE_APPS_SCRIPT_URL dans .env.local.",
    );
  }

  // text/plain → pas de preflight CORS, Apps Script parse quand même via
  // JSON.parse(e.postData.contents).
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });

  // Garde-fou : si le déploiement répond en HTML (expiré / mal configuré)
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(
      "Apps Script non déployé — l'URL répond en HTML au lieu de JSON. Redéployez le Code.gs.",
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    throw Object.assign(new Error(json.error || `Erreur Apps Script (${json.code ?? res.status})`), {
      code: json.code ?? res.status,
    });
  }
  return json.data;
}

function readStoredSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (!token || !userRaw) return null;
    const user = JSON.parse(userRaw);
    return user ? { token, user } : null;
  } catch {
    return null;
  }
}

/** Session persistée (token + profil) si elle existe, sinon null. */
export function getStoredSession() {
  return readStoredSession();
}

/** Persiste le token + profil (retour de `login`/`register`). */
export function storeSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Supprime la session locale (sans appel réseau). */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** `login` → `{ token, expires_at, user }` (user = profil assaini). */
export function login(email, password) {
  return post("login", { email, password });
}

/** `register` → `{ token, expires_at, user }`. Requiert first_name/last_name. */
export function register(data) {
  return post("register", data);
}

/** `getCurrentUser` → profil assaini, ou lève 401 si la session est invalide. */
export function getCurrentUser(token) {
  return post("getCurrentUser", { _token: token });
}

/** `logout` → révoque la session côté serveur (best-effort). */
export async function logout(token) {
  try {
    return await post("logout", { _token: token });
  } catch {
    return { ok: false };
  }
}
