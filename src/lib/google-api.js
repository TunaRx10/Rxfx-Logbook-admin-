/**
 * Google API — Unified module replacing Firebase/Firestore
 * ==========================================================
 * When Firebase is removed (no VITE_FIREBASE_API_KEY), all admin pages
 * use Google services via Apps Script for storage + Gmail + Docs.
 *
 * Apps Script URL: VITE_GOOGLE_APPS_SCRIPT_URL
 *
 * Sections (Sheets tabs):
 *   referrals, payout_requests, support_tickets, mail_queue,
 *   campaign_events, boutique_orders, logs, calendar_events
 *
 * Gmail:
 *   sendEmail(to, subject, body) — sends via Apps Script
 *
 * Docs:
 *   createReport(title, content) — creates via Apps Script
 */

import {
  isSheetsAvailable,
  listSheetRows,
  addSheetRows,
  updateSheetRow,
  deleteSheetRow,
  subscribeToSheetRows,
  batchSyncToSheets,
} from "./sheets-admin";

// Re-export sheets-admin functions
export {
  isSheetsAvailable,
  listSheetRows,
  addSheetRows,
  updateSheetRow,
  deleteSheetRow,
  subscribeToSheetRows,
  batchSyncToSheets,
};

const APPS_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbw0iXt6c99ZTvBmFAngfIU3xv3xpK0U4nNENy6GwlYwVp5YRG6bXABB8dIr-yNeBeLz/exec";

async function postToAppsScript(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error("VITE_GOOGLE_APPS_SCRIPT_URL non configuré");
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);
  // Guard against HTML responses (deployment expired or misconfigured)
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("Apps Script non déployé — l'URL répond en HTML au lieu de JSON. Redéployez le Code.gs sur script.google.com.");
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur Apps Script");
  return json;
}

/* ═══════════════════════════════════════════════════════════
   GMAIL — Send emails via Apps Script
   ═══════════════════════════════════════════════════════════ */

/**
 * Send an email via Gmail (Apps Script).
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} body - plain text or HTML
 * @returns {Promise<{ok: boolean}>}
 */
export async function sendEmail(to, subject, body) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré — impossible d'envoyer un email");
  }
  const result = await postToAppsScript("send_email", { to, subject, body });
  return { ok: result.ok };
}

/**
 * Send a bulk email broadcast.
 * @param {Array<{to: string, subject: string, body: string}>} recipients
 * @returns {Promise<{ok: boolean, sent: number, failed: number}>}
 */
export async function sendBulkEmail(recipients) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("send_bulk_email", { recipients });
  return { ok: result.ok, sent: result.sent || 0, failed: result.failed || 0 };
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE DOCS — Create documents via Apps Script
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a Google Doc report.
 * @param {string} title
 * @param {string} content - HTML content
 * @returns {Promise<{ok: boolean, docUrl?: string}>}
 */
export async function createDoc(title, content) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("create_doc", { title, content });
  return { ok: result.ok, docUrl: result.docUrl };
}

/* ═══════════════════════════════════════════════════════════
   LOGGING — Admin action log
   ═══════════════════════════════════════════════════════════ */

/**
 * Log an admin action to Sheets.
 */
export async function logAdminAction(action, status = "success") {
  const timestamp = new Date().toISOString();
  try {
    await addSheetRows("logs", [
      { type: "admin", message: action, timestamp, status },
    ]);
  } catch (err) {
    console.warn("[google-api] Failed to log admin action:", err);
  }
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE CALENDAR — Events via Apps Script
   ═══════════════════════════════════════════════════════════ */

/**
 * Get upcoming calendar events.
 * @param {number} [days=30] — how many days ahead to fetch
 */
export async function getCalendarEvents(days = 30) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("get_calendar_events", { days });
  return result.events || [];
}

/**
 * Create a Google Calendar event.
 */
export async function createCalendarEvent({ title, description, start_date, end_date, location }) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("create_calendar_event", {
    title, description, start_date, end_date, location,
  });
  return result;
}

/**
 * Delete a calendar event.
 */
export async function deleteCalendarEvent(eventId) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("delete_calendar_event", { event_id: eventId });
  return result;
}

/**
 * Sync subscriptions to calendar (fins d'abonnement, anniversaires).
 * Appelé périodiquement pour maintenir le calendrier à jour.
 */
export async function syncSubscriptionsToCalendar(users) {
  if (!isSheetsAvailable()) return { ok: false };
  const results = [];
  for (const u of users) {
    try {
      // Fin d'abonnement
      if (u.current_period_end) {
        await createCalendarEvent({
          title: `📅 Fin abonnement ${u.plan?.toUpperCase() || "Free"} — ${u.email || u.id}`,
          description: `L'abonnement ${u.plan} de ${u.email || u.id} expire. Plan actuel: ${u.plan}, Statut: ${u.status}`,
          start_date: u.current_period_end,
          end_date: u.current_period_end,
        });
      }
      // Anniversaire
      if (u.birthday) {
        const bday = new Date(u.birthday);
        const thisYear = new Date();
        bday.setFullYear(thisYear.getFullYear());
        if (bday < thisYear) bday.setFullYear(thisYear.getFullYear() + 1);
        await createCalendarEvent({
          title: `🎂 Anniversaire — ${u.display_name || u.email || u.id}`,
          description: `Anniversaire de ${u.display_name || u.email}.`,
          start_date: bday.toISOString(),
          end_date: bday.toISOString(),
        });
      }
      results.push({ id: u.id, ok: true });
    } catch (err) {
      results.push({ id: u.id, ok: false, error: err.message });
    }
  }
  return { ok: true, synced: results.filter(r => r.ok).length, total: results.length };
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE DOCS — Certificats
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a trading certificate for a user.
 */
export async function createCertificate({ user_name, plan, trader_level, stats, date }) {
  if (!isSheetsAvailable()) {
    throw new Error("Apps Script non configuré");
  }
  const result = await postToAppsScript("create_certificate", {
    user_name, plan, trader_level, stats, date,
  });
  return result;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD STATS — Aggregated from Sheets
   ═══════════════════════════════════════════════════════════ */

export { getDashboardFromSheets } from "./sheets-fallback";
