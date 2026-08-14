/**
 * Sheets Fallback — Admin Dashboard
 * ==================================
 * When the Firebase Cloud Functions / Supabase backend is unreachable,
 * the admin dashboard falls back to Google Sheets (via Apps Script) for
 * read-only aggregated metrics.
 *
 * The Apps Script is already deployed and configured via
 * VITE_GOOGLE_APPS_SCRIPT_URL in .env.
 */

const APPS_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbw0iXt6c99ZTvBmFAngfIU3xv3xpK0U4nNENy6GwlYwVp5YRG6bXABB8dIr-yNeBeLz/exec";

/** Check if the Sheets fallback is available. */
export function isSheetsFallbackAvailable() {
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

/**
 * Fetch aggregated dashboard stats from Google Sheets.
 */
export async function getDashboardFromSheets() {
  // Fetch both signups and dashboard data in parallel
  const [signupsResult, dashboardResult] = await Promise.all([
    postToAppsScript("list_signups", { limit: 1000 }).catch(() => ({ rows: [] })),
    postToAppsScript("list_dashboard", { limit: 1000 }).catch(() => ({ rows: [] })),
  ]);

  const signups = signupsResult.rows || [];
  const dashboard = dashboardResult.rows || [];

  // ── Aggregate stats ──
  const uniqueUsers = new Set();
  let activeUsers = 0;
  let proUsers = 0;
  let eliteUsers = 0;
  let starterUsers = 0;

  for (const row of signups) {
    const uid = String(row.user_id || "");
    if (uid) uniqueUsers.add(uid);

    const status = String(row.status || "active").toLowerCase();
    const plan = String(row.plan || "free").toLowerCase();
    if (status === "active" || status === "trialing") {
      activeUsers++;
      if (plan === "pro") proUsers++;
      if (plan === "elite") eliteUsers++;
      if (plan === "starter") starterUsers++;
    }
  }

  // Also count dashboard-only users not in signups
  for (const row of dashboard) {
    const uid = String(row.user_id || "");
    if (uid) uniqueUsers.add(uid);
  }

  let totalTrades = 0;
  let totalPnl = 0;
  let totalWins = 0;
  let weightedWinRateSum = 0;
  let weightedWinRateCount = 0;

  for (const row of dashboard) {
    const trades = Number(row.total_trades) || 0;
    const pnl = Number(row.total_pnl) || 0;
    const wr = Number(row.win_rate) || 0;

    totalTrades += trades;
    totalPnl += pnl;
    // Weight win rate by trade count so a 1000-trade user counts 1000x more
    // than a 1-trade user.
    if (trades > 0) {
      weightedWinRateSum += wr * trades;
      weightedWinRateCount += trades;
      totalWins += Math.round(trades * (wr / 100));
    }
  }

  const winRate = weightedWinRateCount > 0
    ? Math.round(weightedWinRateSum / weightedWinRateCount)
    : 0;

  // Identity nodes from signups (last 10)
  const identityNodes = signups.slice(-10).map((row) => ({
    id: String(row.user_id || "").slice(0, 12) || "---",
    displayName:
      String(row.display_name || row.email || "").split("@")[0] || "Unknown",
    email: String(row.email || ""),
    status: row.email ? "ACTIVE" : "PENDING",
    createdAt: String(row.created_at || row.timestamp || ""),
  }));

  return {
    stats: {
      totalUsers: uniqueUsers.size,
      activeUsers,
      proUsers,
      eliteUsers,
      starterUsers,
      totalTrades,
      totalPnl: Math.round(totalPnl * 100) / 100,
    },
    tradesSum: {
      totalTrades,
      totalPnl: Math.round(totalPnl * 100) / 100,
      winRate,
      wins: totalWins,
    },
    identityNodes,
  };
}
