/**
 * Sheets Admin — CRUD via Google Apps Script
 * ============================================
 * When Firestore is unavailable (no VITE_FIREBASE_API_KEY), admin pages
 * fall back to Google Sheets via Apps Script for all CRUD operations.
 *
 * The Apps Script (deployed at VITE_GOOGLE_APPS_SCRIPT_URL) handles:
 *   - list_<section>     → read all rows
 *   - upsert_<section>   → add/update rows
 *   - delete_row         → delete a row by index
 *   - update_row         → update a row by index
 *
 * Sections: referrals, support_tickets, mail_queue, campaign_events,
 *           payout_requests, logs, boutique_orders
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || "";

/** Check if the Sheets backend is available. */
export function isSheetsAvailable() {
  return !!APPS_SCRIPT_URL;
}

async function postToAppsScript(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    throw new Error("VITE_GOOGLE_APPS_SCRIPT_URL non configuré");
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    throw new Error(`Apps Script HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Erreur Apps Script inconnue");
  }
  return json;
}

/* ═══════════════════════════════════════════════════════════
   LIST — lire toutes les lignes d'un onglet
   ═══════════════════════════════════════════════════════════ */

/**
 * List rows from a Sheets section.
 * @param {string} section - "referrals" | "support_tickets" | "mail_queue" | etc.
 * @param {number} [limit=500]
 * @returns {Promise<Array<{id: string, [key: string]: any}>>}
 */
export async function listSheetRows(section, limit = 500) {
  if (!isSheetsAvailable()) return [];
  try {
    const result = await postToAppsScript(`list_${section}`, { limit });
    return result.rows || [];
  } catch (err) {
    console.error(`[sheets-admin] list_${section} failed:`, err);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   ADD — ajouter une ligne
   ═══════════════════════════════════════════════════════════ */

/**
 * Add one or more rows to a Sheets section.
 * @param {string} section
 * @param {Array<Record<string, any>>} rows
 * @returns {Promise<{ok: boolean, rows?: number}>}
 */
export async function addSheetRows(section, rows) {
  if (!isSheetsAvailable()) return { ok: false };
  try {
    const result = await postToAppsScript(`upsert_${section}`, { rows });
    return { ok: true, rows: result.rows };
  } catch (err) {
    console.error(`[sheets-admin] upsert_${section} failed:`, err);
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
   UPDATE — modifier une ligne par rowIndex
   ═══════════════════════════════════════════════════════════ */

/**
 * Update a row in a Sheets section.
 * @param {string} section
 * @param {number} rowIndex - 0-based index of the row
 * @param {Record<string, any>} data
 * @returns {Promise<boolean>}
 */
export async function updateSheetRow(section, rowIndex, data) {
  if (!isSheetsAvailable()) return false;
  try {
    const result = await postToAppsScript("update_row", { section, rowIndex, data });
    return result.ok === true;
  } catch (err) {
    console.error(`[sheets-admin] update_row failed:`, err);
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   DELETE — supprimer une ligne par rowIndex
   ═══════════════════════════════════════════════════════════ */

/**
 * Delete a row from a Sheets section.
 * @param {string} section
 * @param {number} rowIndex - 0-based index of the row
 * @returns {Promise<boolean>}
 */
export async function deleteSheetRow(section, rowIndex) {
  if (!isSheetsAvailable()) return false;
  try {
    const result = await postToAppsScript("delete_row", { section, rowIndex });
    return result.ok === true;
  } catch (err) {
    console.error(`[sheets-admin] delete_row failed:`, err);
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   BATCH — envoi groupé de plusieurs sections
   ═══════════════════════════════════════════════════════════ */

/**
 * Batch sync multiple sections at once.
 * @param {Record<string, Array<Record<string, any>>>} sections
 * @returns {Promise<{ok: boolean, totalRows: number}>}
 */
export async function batchSyncToSheets(sections) {
  if (!isSheetsAvailable()) return { ok: false, totalRows: 0 };
  try {
    const result = await postToAppsScript("batch", { sections });
    return { ok: true, totalRows: result.totalRows || 0 };
  } catch (err) {
    console.error("[sheets-admin] batchSync failed:", err);
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
   POLLING — subscribe simulé (polling toutes les N secondes)
   ═══════════════════════════════════════════════════════════ */

/**
 * Simulate a real-time subscription via polling.
 * Returns an unsubscribe function.
 *
 * @param {string} section
 * @param {(rows: Array<Record<string, any>>) => void} callback
 * @param {number} [intervalMs=5000]
 * @returns {() => void} unsubscribe
 */
export function subscribeToSheetRows(section, callback, intervalMs = 5000) {
  let active = true;
  let timer = null;

  async function poll() {
    if (!active) return;
    try {
      const rows = await listSheetRows(section);
      if (active) callback(rows);
    } catch (err) {
      console.warn(`[sheets-admin] poll ${section} error:`, err);
    }
    if (active) {
      timer = setTimeout(poll, intervalMs);
    }
  }

  poll();

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}
