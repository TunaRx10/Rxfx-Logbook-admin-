/**
 * RxFx Admin — Supabase Admin Proxy
 *
 * 🔒 SECURITY: Toutes les opérations passent par le proxy serveur
 * `/api/supabase-direct` (Vite plugin dev-supabase-direct en dev,
 * Vercel serverless function en prod). La clé SUPABASE_SERVICE_ROLE_KEY
 * n'est JAMAIS exposée au client — seul le serveur la lit depuis
 * process.env.
 */

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

export function subscribeToSupportTickets(callback, intervalMs = 8000) {
  let active = true;
  let timer = null;
  async function poll() {
    if (!active) return;
    try {
      const tickets = await listSupportTickets("all", 100);
      if (active) callback(tickets);
    } catch (err) {
      console.warn("[supabase-admin] poll support_tickets:", err?.message);
      if (active) callback([]);
    }
    if (active) timer = setTimeout(poll, intervalMs);
  }
  poll();
  return () => { active = false; if (timer) clearTimeout(timer); };
}
