/**
 * RxFx Admin — Supabase Admin Proxy
 *
 * 🔒 SECURITY: Toutes les opérations passent par le proxy serveur
 * `/api/supabase-direct` (Vite plugin dev-supabase-direct en dev,
 * Vercel serverless function en prod). La clé SUPABASE_SERVICE_ROLE_KEY
 * n'est JAMAIS exposée au client — seul le serveur la lit depuis
 * process.env.
 */

import { supabase as realtimeSupabase } from "./supabase";

const PROXY_URL = "/api/supabase-direct";

async function callProxy(action, payload = {}) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || `HTTP ${res.status}`), { code: res.status, degraded: err.degraded });
  }
  const { data } = await res.json();
  return data;
}

// ⚡ All functions now proxy through the server-side endpoint.
// This keeps the service_role key server-only.
export const safeCallProxy = callProxy;
export const getAdminStats = () => callProxy("getAdminStats");
export const getTradesSummary = () => callProxy("getTradesSummary");
export const getAllUsers = () => callProxy("getAllUsers");
export const getAllUsersWithSubs = () => callProxy("getAllUsersWithSubs");
export const updateUserProfile = (uid, updates) => callProxy("updateUserProfile", { uid, updates });
export const deleteUser = (uid) => callProxy("deleteUser", { uid });
export const suspendUser = (uid, reason, adminUid) => callProxy("suspendUser", { uid, reason, adminUid });
export const reactivateUser = (uid) => callProxy("reactivateUser", { uid });
export const banUser = (uid, reason, adminUid) => callProxy("banUser", { uid, reason, adminUid });
export const unbanUser = (uid) => callProxy("unbanUser", { uid });
export const getUserModerationHistory = (uid) => callProxy("getUserModerationHistory", { uid });
export const getAllTrades = (limit) => callProxy("getAllTrades", { limit });
export const getAuditLogs = (limit) => callProxy("getAuditLogs", { limit });
export const getPaymentConfig = () => callProxy("getPaymentConfig");
export const setPaymentConfig = (cfg) => callProxy("setPaymentConfig", cfg);
export const getPayoutConfig = () => callProxy("getPayoutConfig");
export const setPayoutConfig = (cfg) => callProxy("setPayoutConfig", cfg);
export const getDiscordInviteLink = () => callProxy("getDiscordInviteLink");
export const setDiscordInviteLink = (link) => callProxy("setDiscordInviteLink", { link });
export const getSystemSetting = (key) => callProxy("getSystemSetting", { key });
export const getAllSystemSettings = () => callProxy("getAllSystemSettings");
export const setSystemSetting = (key, value) => callProxy("setSystemSetting", { key, value });
export const listCampaignEvents = (limit) => callProxy("listCampaignEvents", { limit });
export const createCampaignEvent = (event) => callProxy("createCampaignEvent", { event });
export const deleteCampaignEvent = (id) => callProxy("deleteCampaignEvent", { id });
export const toggleCampaignEventStatus = (id, currentStatus) => callProxy("toggleCampaignEventStatus", { id, currentStatus });
export const listTable = (tableName, limit) => callProxy("listTable", { tableName, limit });
export const deleteRow = (tableName, idColumn, idValue) => callProxy("deleteRow", { tableName, idColumn, idValue });
export const updateRow = (tableName, idColumn, idValue, updates) => callProxy("updateRow", { tableName, idColumn, idValue, updates });
export const insertRow = (tableName, data) => callProxy("insertRow", { tableName, data });
export const listSupportTickets = (status, limit) => callProxy("listSupportTickets", { status, limit });
export const updateSupportTicket = (id, updates) => callProxy("updateSupportTicket", { id, updates });
export const createSupportTicket = (ticket) => callProxy("createSupportTicket", { ticket });
export const deleteSupportTicket = (id) => callProxy("deleteSupportTicket", { id });
export const listReferrals = (limit) => callProxy("listReferrals", { limit });
export const listPayoutRequests = (limit) => callProxy("listPayoutRequests", { limit });
export const updateReferral = (id, updates) => callProxy("updateReferral", { id, updates });
export const updatePayoutRequest = (id, updates) => callProxy("updatePayoutRequest", { id, updates });

export function subscribeToTable(tableName, callback) {
  let active = true;
  let timer = null;
  async function poll() {
    if (!active) return;
    try {
      const rows = await listTable(tableName, 200);
      if (active) callback(rows);
    } catch (err) {
      console.warn(`[supabase-admin] poll ${tableName}:`, err?.message);
    }
    if (active) timer = setTimeout(poll, 8000);
  }
  poll();
  return () => { active = false; if (timer) clearTimeout(timer); };
}

/**
 * `subscribeToSupportTickets`
 * ---------------------------
 * Subscribe to Supabase Realtime (canal `postgres_changes` sur
 * `public.support_tickets`) + fallback polling.
 *
 * Pourquoi realtime + polling :
 *  - **Realtime** : un INSERT/UPDATE/DELETE de la part d'un autre client
 *    (utilisateur côté mobile, autre admin, webhook Stripe…) déclenche
 *    un push WebSocket → callback invoqué sous ~50ms.
 *  - **Polling fallback** (intervalle `intervalMs`) : si Realtime se
 *    déconnecte (réseau mobile, idle tab, WebSocket fermé par le proxy),
 *    on re-fetch la liste complète toutes les N secondes pour ne jamais
 *    laisser la UI se désynchroniser.
 *
 * RLS-aware : le canal Realtime ne pousse QUE les rows visibles par le
 * JWT courant (admin → tout, user → ses tickets uniquement).
 *
 * @param {(rows: any[]) => void} callback              appelé à chaque update
 * @param {number}                 intervalMs           polling fallback (def 30s)
 * @param {{
 *   onInsert?: (row: any) => void;
 *   onUpdate?: (row: any, old: any) => void;
 *   onDelete?: (old: any) => void;
 *   channelName?: string;
 * }} [options]
 * @returns {() => void} unsubscribe function
 */
export function subscribeToSupportTickets(callback, intervalMs = 30000, options = {}) {
  const { onInsert, onUpdate, onDelete, channelName } = options;
  const channelId = channelName || `support_tickets_${Math.random().toString(36).slice(2, 9)}`;
  let active = true;
  let timer = null;
  let channel = null;
  let lastEventAt = Date.now();

  /** Refetch complet (toujours après chaque event Realtime pour rester
   *  simple : on évite les bugs de diff, on source-of-truth la DB. */
  async function fetchAll() {
    if (!active) return;
    try {
      const tickets = await listSupportTickets("all", 100);
      if (active) callback(tickets);
    } catch (err) {
      console.warn("[support-realtime] poll failed:", err?.message);
      if (active) callback([]);
    }
  }

  /** Setup Realtime channel. Si l'env n'a pas le module (build SSR etc.) on
   *  bascule silencieusement sur le polling seul. */
  function setupChannel() {
    if (!realtimeSupabase || !realtimeSupabase.channel) {
      console.warn("[support-realtime] supabase channel() absent, polling only");
      return;
    }
    try {
      channel = realtimeSupabase
        .channel(channelId, {
          config: {
            presence: { key: "" },
            broadcast: { self: false, ack: false },
            // private channel — events server-side, RLS filtré
          },
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_tickets" },
          (payload) => {
            if (!active) return;
            lastEventAt = Date.now();
            // Hook optionnel côté caller (toast, badge animation…)
            try {
              if (payload?.eventType === "INSERT") onInsert?.(payload.new);
              if (payload?.eventType === "UPDATE") onUpdate?.(payload.new, payload.old);
              if (payload?.eventType === "DELETE") onDelete?.(payload.old);
            } catch (hookErr) {
              console.warn("[support-realtime] callback hook threw:", hookErr);
            }
            // Refetch pour merge proprement dans la liste
            fetchAll();
          }
        )
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            console.info("[support-realtime] subscribed on", channelId);
          } else if (status === "CHANNEL_ERROR") {
            console.warn("[support-realtime] channel error:", err?.message || err);
          } else if (status === "TIMED_OUT") {
            console.warn("[support-realtime] timed out, falling back to polling");
          } else if (status === "CLOSED") {
            console.info("[support-realtime] closed");
          }
        });
    } catch (err) {
      console.warn("[support-realtime] setup failed, polling only:", err?.message);
      channel = null;
    }
  }

  // Initial fetch immédiat + setup du canal Realtime
  fetchAll();
  setupChannel();

  // Polling fallback : si aucun event Realtime depuis `intervalMs`, on refetch.
  // Garantit la convergence même quand le WebSocket dort ou est éteint.
  timer = setInterval(() => {
    if (!active) return;
    if (Date.now() - lastEventAt >= intervalMs - 500) {
      fetchAll();
    }
  }, intervalMs);

  return () => {
    active = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (channel) {
      try {
        realtimeSupabase.removeChannel(channel).catch(() => {});
      } catch (_) {}
      channel = null;
    }
  };
}
