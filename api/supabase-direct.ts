/**
 * Vercel Serverless: Supabase Admin Proxy
 *
 * Remplace le plugin Vite `dev-supabase-direct.js` en production.
 * Runtime Node.js → signature (req, res).
 */

import { createClient } from "@supabase/supabase-js";

function getClient() {
  const url = process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function handleAction(client: any, action: string, payload: any) {
  const rest = payload || {};

  switch (action) {
    case "getAdminStats": {
      const [{ data: profiles, error: profErr }, { data: trades, error: tradeErr }] =
        await Promise.all([
          client.from("profiles").select("id, subscription_tier, email"),
          client.from("trades").select("id, pnl"),
        ]);
      if (profErr) throw profErr;
      if (tradeErr) throw tradeErr;
      const proUsers = profiles?.filter((p: any) => p.subscription_tier === "pro").length || 0;
      const eliteUsers = profiles?.filter((p: any) => p.subscription_tier === "elite").length || 0;
      const activeUsers = profiles?.filter((p: any) => p.subscription_tier && p.subscription_tier !== "free").length || 0;
      return {
        totalUsers: profiles?.length || 0, activeUsers, proUsers, eliteUsers, starterUsers: 0,
        totalTrades: trades?.length || 0,
        totalPnl: trades?.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) || 0,
      };
    }
    case "getTradesSummary": {
      const { data: trades, error } = await client.from("trades").select("pnl, outcome");
      if (error) throw error;
      const totalTrades = trades?.length || 0;
      const wins = trades?.filter((t: any) => (Number(t.pnl) || 0) > 0).length || 0;
      const totalPnl = trades?.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) || 0;
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
      return { totalTrades, totalPnl, winRate, wins, losses: totalTrades - wins };
    }
    case "getAllUsers":
    case "getAllUsersWithSubs": {
      const { data, error } = await client.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    }
    case "banUser": {
      const { uid, reason, adminUid } = rest;
      if (!uid) throw new Error("uid required");
      if (adminUid && uid === adminUid) throw new Error("Cannot ban your own account");
      const safeReason = String(reason ?? "").slice(0, 280);
      const now = new Date().toISOString();
      const { error: profErr } = await client.from("profiles").update({
        banned: true, banned_at: now, banned_reason: safeReason,
        banned_by: String(adminUid ?? "admin").slice(0, 64), status: "inactive",
      }).eq("id", uid);
      if (profErr) throw profErr;
      await client.from("user_moderation_events").insert({
        type: "ban", user_id: uid, admin_uid: adminUid ?? null, reason: safeReason, created_at: now,
      });
      return { ok: true };
    }
    case "unbanUser": {
      const { uid } = rest;
      if (!uid) throw new Error("uid required");
      const now = new Date().toISOString();
      const { error: profErr } = await client.from("profiles").update({
        banned: false, banned_at: null, banned_reason: null, banned_by: null, status: "active",
      }).eq("id", uid);
      if (profErr) throw profErr;
      await client.from("user_moderation_events").insert({ type: "unban", user_id: uid, created_at: now });
      return { ok: true };
    }
    case "suspendUser": {
      const { uid, reason, adminUid } = rest;
      if (!uid) throw new Error("uid required");
      if (adminUid && uid === adminUid) throw new Error("Cannot suspend your own account");
      const safeReason = String(reason ?? "").slice(0, 280);
      const now = new Date().toISOString();
      const { error } = await client.from("profiles").update({
        status: "suspended", suspended_at: now, suspended_reason: safeReason,
        suspended_by: String(adminUid ?? "admin").slice(0, 64),
      }).eq("id", uid);
      if (error) throw error;
      return { ok: true };
    }
    case "reactivateUser": {
      const { uid } = rest;
      if (!uid) throw new Error("uid required");
      const { error } = await client.from("profiles").update({
        status: "active", suspended_at: null, suspended_reason: null, suspended_by: null,
      }).eq("id", uid);
      if (error) throw error;
      return { ok: true };
    }
    case "updateUserProfile": {
      const { uid, updates } = rest;
      if (!uid || !updates) throw new Error("uid + updates required");
      const SUB_FIELDS = new Set(["plan", "subscriptionStatus", "subscriptionStatusOverride", "subscription_status"]);
      const profUpdates: Record<string, any> = {};
      const subUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (SUB_FIELDS.has(k)) {
          if (k === "subscriptionStatus" || k === "subscriptionStatusOverride" || k === "subscription_status") subUpdates.status = v;
          else if (k === "plan") { subUpdates.plan = v; profUpdates.subscription_tier = v; profUpdates.plan = v; }
          else subUpdates[k] = v;
        } else {
          profUpdates[k] = (k === "status" && typeof v === "string") ? v.toLowerCase() : v;
        }
      }
      if (Object.keys(profUpdates).length > 0) {
        const { error: pfErr } = await client.from("profiles").update(profUpdates).eq("id", uid);
        if (pfErr) throw pfErr;
      }
      if (Object.keys(subUpdates).length > 0) {
        const { error: subErr } = await client.from("subscriptions").upsert({ user_id: uid, ...subUpdates }, { onConflict: "user_id" });
        if (subErr) {
          const { data: existing } = await client.from("subscriptions").select("user_id").eq("user_id", uid).maybeSingle();
          const { error: fallbackErr } = existing
            ? await client.from("subscriptions").update(subUpdates).eq("user_id", uid)
            : await client.from("subscriptions").insert({ user_id: uid, ...subUpdates });
          if (fallbackErr) console.warn("[supabase-direct] Subscription sync failed:", fallbackErr.message);
        }
      }
      return { ok: true };
    }
    case "deleteUser": {
      const { uid } = rest;
      if (!uid) throw new Error("uid required");
      await Promise.all([
        client.from("profiles").delete().eq("id", uid),
        client.from("subscriptions").delete().eq("user_id", uid),
        client.from("payment_logs").delete().eq("user_id", uid),
      ]);
      return { ok: true };
    }
    case "getUserModerationHistory": {
      const { uid } = rest;
      const { data, error } = await client.from("user_moderation_events").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    }
    case "getAllTrades": {
      const { data, error } = await client.from("trades").select("*").order("opened_at", { ascending: false }).limit(rest.limit || 100);
      if (error) throw error;
      return data || [];
    }
    case "listTable": {
      const { data, error } = await client.from(rest.tableName).select("*").limit(rest.limit || 50);
      if (error) throw error;
      const rows = data || [];
      if (rest.tableName === "system_config") {
        return rows.map((row: any) =>
          ["payment_private_key", "suby_api_key", "suby_webhook_secret"].includes(row?.key)
            ? { ...row, value: null, redacted: true } : row);
      }
      return rows;
    }
    case "updateRow": {
      const { tableName, idColumn, idValue, updates } = rest;
      if (!tableName || !idColumn || idValue === undefined || !updates) throw new Error("Paramètres requis");
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) { if (v !== undefined && v !== "") payload[k] = v; }
      if (Object.keys(payload).length === 0) return { ok: true, updated: false };
      const { data, error } = await client.from(tableName).update(payload).eq(idColumn, idValue).select();
      if (error) throw error;
      return { ok: true, updated: (data?.length ?? 0) > 0, row: data?.[0] ?? null };
    }
    case "deleteRow": {
      const { tableName, idColumn, idValue } = rest;
      if (!tableName || !idColumn || idValue === undefined) throw new Error("Paramètres requis");
      const { error } = await client.from(tableName).delete().eq(idColumn, idValue);
      if (error) throw error;
      return { ok: true };
    }
    case "insertRow": {
      const { tableName, data } = rest;
      if (!tableName || !data) throw new Error("Paramètres requis");
      const { data: inserted, error } = await client.from(tableName).insert(data).select();
      if (error) throw error;
      return inserted || [];
    }
    case "getPaymentConfig": {
      const { data, error } = await client.from("system_config").select("key,value").in("key", ["payment_merchant_id", "payment_private_key", "payment_sandbox"]);
      if (error) throw error;
      const values: Record<string, string> = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));
      return { merchantId: values.payment_merchant_id || "", hasPrivateKey: Boolean(values.payment_private_key), sandbox: values.payment_sandbox !== "false" };
    }
    case "getPayoutConfig": {
      const { data, error } = await client.from("system_config").select("key,value").in("key", ["payout_wallet_address", "payout_currency", "payout_network"]);
      if (error) throw error;
      const values: Record<string, string> = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));
      return { walletAddress: values.payout_wallet_address || "", currency: values.payout_currency || "USDT", network: values.payout_network || "TRON" };
    }
    case "getDiscordInviteLink": {
      const { data, error } = await client.from("system_config").select("value").eq("key", "discord_invite_link").maybeSingle();
      if (error) throw error;
      return { link: data?.value || "" };
    }
    case "setPaymentConfig": {
      const { merchantId, privateKey, sandbox } = rest;
      const upsert = (k: string, v: any) => client.from("system_config").upsert({ key: k, value: String(v ?? "") }, { onConflict: "key" });
      const writes = [upsert("payment_merchant_id", merchantId), upsert("payment_sandbox", sandbox)];
      if (privateKey) writes.push(upsert("payment_private_key", privateKey));
      await Promise.all(writes);
      return { ok: true };
    }
    case "setPayoutConfig": {
      const { walletAddress, currency, network } = rest;
      const upsert = (k: string, v: any) => client.from("system_config").upsert({ key: k, value: String(v ?? "") }, { onConflict: "key" });
      await Promise.all([upsert("payout_wallet_address", walletAddress), upsert("payout_currency", currency), upsert("payout_network", network)]);
      return { ok: true };
    }
    case "setDiscordInviteLink": {
      const { link } = rest;
      const { error } = await client.from("system_config").upsert({ key: "discord_invite_link", value: String(link ?? "") }, { onConflict: "key" });
      if (error) throw error;
      return { ok: true };
    }
    case "getSystemSetting": {
      if (["payment_private_key", "suby_api_key", "suby_webhook_secret"].includes(rest.key)) return { value: null, redacted: true };
      const { data, error } = await client.from("system_config").select("value").eq("key", rest.key).maybeSingle();
      if (error) throw error;
      return data || { value: null };
    }
    case "getAllSystemSettings": {
      const { data, error } = await client.from("system_config").select("key,value");
      if (error) throw error;
      return (data || []).reduce((settings: Record<string, string>, row: any) => {
        if (row?.key && row.key !== "payment_private_key" && row.key !== "suby_api_key" && row.key !== "suby_webhook_secret") settings[row.key] = row.value;
        return settings;
      }, {});
    }
    case "setSystemSetting": {
      const { key, value } = rest;
      const { error } = await client.from("system_config").upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      return { ok: true };
    }
    case "listCampaignEvents": {
      const { data, error } = await client.from("campaign_events").select("*").order("created_at", { ascending: false }).limit(rest.limit || 100);
      if (error) throw error;
      return data || [];
    }
    case "createCampaignEvent": {
      const { event } = rest;
      if (!event || !event.title) throw new Error("event.title required");
      const now = new Date().toISOString();
      const { data, error } = await client.from("campaign_events").insert({
        title: String(event.title).slice(0, 200), description: String(event.description ?? "").slice(0, 2000),
        location: String(event.location ?? "").slice(0, 200), link: String(event.link ?? "").slice(0, 500),
        status: event.status ?? "upcoming", type: event.type ?? "campaign", created_at: now, updated_at: now,
      }).select();
      if (error) throw error;
      return { id: data?.[0]?.id, ok: true };
    }
    case "deleteCampaignEvent": {
      const { id } = rest;
      if (!id) throw new Error("id required");
      const { error } = await client.from("campaign_events").delete().eq("id", String(id));
      if (error) throw error;
      return { ok: true };
    }
    case "toggleCampaignEventStatus": {
      const { id, currentStatus } = rest;
      if (!id) throw new Error("id required");
      const newStatus = currentStatus === "cancelled" ? "active" : "cancelled";
      const { error } = await client.from("campaign_events").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", String(id));
      if (error) throw error;
      return { ok: true, status: newStatus };
    }
    case "getAuditLogs": {
      const { data, error } = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(rest.limit || 50);
      if (error) throw error;
      return data || [];
    }
    case "listSupportTickets": {
      const { status, limit: ticketLimit } = rest || {};
      let query = client.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (status && status !== "all") query = query.eq("status", status);
      query = query.limit(ticketLimit || 100);
      const { data, error } = await query;
      if (error) {
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205")
          throw new Error("TABLE_MISSING: La table support_tickets n'existe pas.");
        throw error;
      }
      return data || [];
    }
    case "updateSupportTicket": {
      const { id, updates } = rest;
      if (!id) throw new Error("id required");
      const { data, error } = await client.from("support_tickets").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select();
      if (error) throw error;
      return data?.[0] || { ok: true };
    }
    case "createSupportTicket": {
      const { ticket } = rest;
      if (!ticket) throw new Error("ticket required");
      const now = new Date().toISOString();
      const { data, error } = await client.from("support_tickets").insert({
        user_id: ticket.user_id || null, user_email: ticket.user_email || "", user_name: ticket.user_name || "",
        subject: ticket.subject || "Sans sujet", status: ticket.status || "open", priority: ticket.priority || "normal",
        messages: ticket.messages || [], replies: [], created_at: now, updated_at: now,
      }).select();
      if (error) throw error;
      return data?.[0] || { id: "local-" + Date.now() };
    }
    case "deleteSupportTicket": {
      const { id } = rest;
      if (!id) throw new Error("id required");
      const { error } = await client.from("support_tickets").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    }
    // ── Auth: PIN verification ──
    case "verifyAdminPin": {
      const { pin } = rest;
      const expectedPin = process.env.VITE_ADMIN_PIN || process.env.ADMIN_PIN || "";
      if (!pin || typeof pin !== "string" || !expectedPin) {
        return { success: false, attemptsRemaining: 0, isLocked: false };
      }
      if (pin === expectedPin) {
        return { success: true, attemptsRemaining: 5, isLocked: false };
      }
      return { success: false, attemptsRemaining: 3, isLocked: false };
    }

    case "listReferrals":
    case "listPayoutRequests": {
      try {
        const tbl = action === "listReferrals" ? "referrals" : "payout_requests";
        const { data, error } = await client.from(tbl).select("*").limit(rest.limit || 50);
        if (error) throw error;
        return data || [];
      } catch { return []; }
    }
    case "updateReferral":
    case "updatePayoutRequest": {
      const { id, updates } = rest;
      if (!id) throw new Error("id required");
      const tbl = action === "updateReferral" ? "referrals" : "payout_requests";
      try { await client.from(tbl).update(updates).eq("id", id); } catch { /* table may not exist */ }
      return { ok: true };
    }
    default:
      throw new Error(`Action non supportée: ${action}`);
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const client = getClient();
    if (!client) {
      return res.status(503).json({
        error: "Supabase non configuré (SUPABASE_SERVICE_ROLE_KEY manquant)",
        degraded: true,
      });
    }

    const { action, payload } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: "Missing action" });
    }

    const result = await handleAction(client, action, payload);
    return res.status(200).json({ data: result });
  } catch (err: any) {
    console.error("[supabase-direct] Error:", err.message);
    return res.status(500).json({ error: err.message, degraded: false });
  }
}
