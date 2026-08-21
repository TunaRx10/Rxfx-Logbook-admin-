/**
 * RxFx Admin — Data access layer
 * ==============================
 * Backend unique : Google Sheets via Apps Script (`VITE_GOOGLE_APPS_SCRIPT_URL`)
 * — nouveau protocole `{ action, payload }` du Code.gs final.
 *
 * Les signatures exportées restent identiques pour ne pas toucher les 20+
 * pages qui importent ce module. Seules deux normalisations sont appliquées :
 *   • `listTable`     → le script renvoie `{ data, pagination }` → on retourne
 *                       le tableau `.data`.
 *   • `getAllUsersWithSubs` → alias de `getAllUsers` (le script n'a plus
 *                       d'action dédiée ; les deux renvoyaient les mêmes rows).
 *
 * Auth : le token de session admin (JWT `role=admin`) est envoyé dans
 * `payload._token`. La clé API statique `API_KEY` ne doit JAMAIS être exposée
 * au client — elle reste côté serveur / proxy.
 */

import { getStoredSession } from "./apps-script-auth";

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

/** True quand Google Sheets (Apps Script) est le backend de données. */
export function isSheetsBackend() {
  return !!APPS_SCRIPT_URL_RAW;
}

async function callBackend(action, payload = {}) {
  if (!APPS_SCRIPT_URL_RAW) {
    throw new Error(
      "VITE_GOOGLE_APPS_SCRIPT_URL non configuré — l'app admin fonctionne uniquement avec Google Sheets (Apps Script)."
    );
  }
  // Authentification par token de session admin (jamais par ?key= côté client).
  const session = getStoredSession();
  if (import.meta.env.DEV) {
    // 🔒 DEV-ONLY : en local, on utilise TOUJOURS la clé API admin (même si
    // une vieille session traîne dans localStorage). Une session périmée
    // enverrait un `_token` invalide → 401 ; la clé API fait passer
    // `isAdmin_` directement. Vite inline la clé uniquement en dev via
    // .env.local ; en build prod cette branche est éliminée
    // (import.meta.env.DEV === false).
    const key = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_KEY || "";
    if (key) payload._key = key;
  } else if (session?.token) {
    payload._token = session.token;
  }
  // text/plain → pas de preflight CORS, Apps Script parse quand même via
  // JSON.parse(e.postData.contents).
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { code: res.status });
  }
  // Garde-fou : si le déploiement répond en HTML (expiré / mal configuré)
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("Apps Script non déployé — l'URL répond en HTML au lieu de JSON. Redéployez le Code.gs.");
  }
  const json = await res.json();
  if (!json.ok) {
    throw Object.assign(new Error(json.error || "Erreur Apps Script"), { code: json.code });
  }
  return json.data;
}

// ⚡ Export des actions — signatures inchangées pour les pages existantes.
export const safeCallProxy = callBackend;
export const getAdminStats = () => callBackend("getAdminStats");
export const getTradesSummary = () => callBackend("getTradesSummary");
export const getAllUsers = () => callBackend("getAllUsers");
// Sheets : pas d'action dédiée → alias de getAllUsers (mêmes rows).
export const getAllUsersWithSubs = () => callBackend("getAllUsers");
export const updateUserProfile = (uid, updates) => callBackend("updateUserProfile", { uid, updates });
export const deleteUser = (uid) => callBackend("deleteUser", { uid });
export const suspendUser = (uid, reason, adminUid) => callBackend("suspendUser", { uid, reason, adminUid });
export const reactivateUser = (uid) => callBackend("reactivateUser", { uid });
export const banUser = (uid, reason, adminUid) => callBackend("banUser", { uid, reason, adminUid });
export const unbanUser = (uid) => callBackend("unbanUser", { uid });
export const getUserModerationHistory = (uid) => callBackend("getUserModerationHistory", { uid });
export const getAllTrades = (limit) => callBackend("getAllTrades", { limit });
export const getAuditLogs = (limit) => callBackend("getAuditLogs", { limit });
export const getPaymentConfig = () => callBackend("getPaymentConfig");
export const setPaymentConfig = (cfg) => callBackend("setPaymentConfig", cfg);
export const getPayoutConfig = () => callBackend("getPayoutConfig");
export const setPayoutConfig = (cfg) => callBackend("setPayoutConfig", cfg);
export const getDiscordInviteLink = () => callBackend("getDiscordInviteLink");
export const setDiscordInviteLink = (link) => callBackend("setDiscordInviteLink", { link });
export const getSystemSetting = (key) => callBackend("getSystemSetting", { key });
export const getAllSystemSettings = () => callBackend("getAllSystemSettings");
export const setSystemSetting = (key, value) => callBackend("setSystemSetting", { key, value });
export const listCampaignEvents = (limit) => callBackend("listCampaignEvents", { limit });
export const createCampaignEvent = (event) => callBackend("createCampaignEvent", { event });
export const deleteCampaignEvent = (id) => callBackend("deleteCampaignEvent", { id });
export const toggleCampaignEventStatus = (id, currentStatus) => callBackend("toggleCampaignEventStatus", { id, currentStatus });
export const listSupportTickets = (status, limit) => callBackend("listSupportTickets", { status, limit });
export const updateSupportTicket = (id, updates) => callBackend("updateSupportTicket", { id, updates });
export const createSupportTicket = (ticket) => callBackend("createSupportTicket", { ticket });
export const deleteSupportTicket = (id) => callBackend("deleteSupportTicket", { id });
export const listReferrals = (limit) => callBackend("listReferrals", { limit });
export const listPayoutRequests = (limit) => callBackend("listPayoutRequests", { limit });
export const updateReferral = (id, updates) => callBackend("updateReferral", { id, updates });
export const updatePayoutRequest = (id, updates) => callBackend("updatePayoutRequest", { id, updates });

/**
 * `listTable` — renvoie un tableau de rows.
 * Le script Apps Script renvoie `{ data, pagination }` ; on normalise ici
 * pour rester compatible avec l'ancien contrat (tableau direct).
 */
export async function listTable(tableName, limit) {
  const data = await callBackend("listTable", { tableName, limit });
  if (isSheetsBackend()) {
    if (Array.isArray(data)) return data;
    return (data && Array.isArray(data.data)) ? data.data : [];
  }
  return data;
}

export async function deleteRow(tableName, idColumn, idValue) {
  return callBackend("deleteRow", { tableName, idColumn, idValue });
}

export async function updateRow(tableName, idColumn, idValue, updates) {
  return callBackend("updateRow", { tableName, idColumn, idValue, updates });
}

export async function insertRow(tableName, data) {
  return callBackend("insertRow", { tableName, data });
}

export function subscribeToTable(tableName, callback) {
  let active = true;
  let timer = null;
  async function poll() {
    if (!active) return;
    try {
      const rows = await listTable(tableName, 200);
      if (active) callback(rows);
    } catch (err) {
      console.warn(`[data] poll ${tableName}:`, err?.message);
    }
    if (active) timer = setTimeout(poll, 8000);
  }
  poll();
  return () => { active = false; if (timer) clearTimeout(timer); };
}

/**
 * `subscribeToSupportTickets` — polling Google Sheets via `listSupportTickets`.
 * Les callbacks `onInsert` / `onUpdate` / `onDelete` sont déduits par diff
 * entre deux polls (équivalent léger du Realtime, sans dépendance externe).
 * Le premier poll initialise l'état sans déclencher de `onInsert` (évite les
 * faux toasts pour les tickets déjà existants).
 */
export function subscribeToSupportTickets(callback, intervalMs = 30000, options = {}) {
  const { onInsert, onUpdate, onDelete } = options;
  let active = true;
  let timer = null;
  let known = new Map(); // id → row

  const rowKey = (row) => String(row?.id ?? JSON.stringify(row));

  async function fetchAll() {
    if (!active) return;
    try {
      const tickets = await listSupportTickets("all", 100);
      if (!active) return;

      const next = new Map();
      for (const t of tickets || []) next.set(rowKey(t), t);

      // Diff par rapport à l'état précédent (silencieux au premier poll).
      if (known.size > 0) {
        for (const [id, row] of next) {
          const prev = known.get(id);
          if (!prev) {
            try { onInsert?.(row); } catch (hookErr) { console.warn("[support] onInsert threw:", hookErr); }
          } else if (JSON.stringify(prev) !== JSON.stringify(row)) {
            try { onUpdate?.(row, prev); } catch (hookErr) { console.warn("[support] onUpdate threw:", hookErr); }
          }
        }
        for (const [id, prev] of known) {
          if (!next.has(id)) {
            try { onDelete?.(prev); } catch (hookErr) { console.warn("[support] onDelete threw:", hookErr); }
          }
        }
      }

      known = next;
      callback(tickets);
    } catch (err) {
      console.warn("[support] poll failed:", err?.message);
      if (active) callback([]);
    }
  }

  fetchAll();
  timer = setInterval(fetchAll, intervalMs);

  return () => {
    active = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    known.clear();
  };
}
