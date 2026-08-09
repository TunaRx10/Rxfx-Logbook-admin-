/**
 * Vite Dev Plugin: Direct Supabase Admin Proxy
 * 
 * In local dev, Firebase Cloud Functions aren't running. Instead of showing
 * "Mode dégradé" forever, this plugin spins up a local Express-like
 * middleware at `/api/supabase-direct` that accepts the same
 * `{ action, payload }` calls the admin dashboard sends via Firebase
 * proxy, but executes them directly against Supabase using the
 * SERVICE_ROLE key (server-side only — never exposed to the browser).
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to .env (get from Supabase Dashboard → Settings → API)
 *   2. This plugin auto-detects the env var and activates
 *   3. If not set, falls back to returning degraded errors (same as before)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

/**
 * Schema cache (OpenAPI /rest/v1/) pour la coercition de types.
 * Récupère une seule fois la définition des colonnes (array / json / scalar)
 * pour chaque table, afin que `updateRow` convertisse correctement les
 * valeurs envoyées par le Data Browser (ex: birth_date est `date[]` en base
 * → on envoie un tableau, pas une string).
 */
let schemaCachePromise = null;

function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL || "";
}

function getServiceKey() {
  // Accept SUPABASE_SERVICE_ROLE_KEY first, fall back to VITE_ variant
  // for backward compat during migration away from VITE_ prefixed secrets.
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
}

async function loadSchemaCache() {
  if (schemaCachePromise) return schemaCachePromise;
  schemaCachePromise = (async () => {
    const url = getSupabaseUrl();
    const key = getServiceKey();
    if (!url || !key) return {};
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return {};
      const spec = await res.json();
      const map = {};
      const defs = spec.definitions || {};
      for (const [table, def] of Object.entries(defs)) {
        const props = def.properties || {};
        map[table] = {};
        for (const [col, meta] of Object.entries(props)) {
          if (meta.type === "array") map[table][col] = "array";
          else if (meta.type === "object" || meta.format === "jsonb") map[table][col] = "json";
          else map[table][col] = "scalar";
        }
      }
      return map;
    } catch {
      // Échec réseau transitoire → on réessaie au prochain appel
      schemaCachePromise = null;
      return {};
    }
  })();
  return schemaCachePromise;
}

/**
 * Map admin actions to Supabase queries.
 * Mirrors the server-side `supabaseAdminProxy` Cloud Function.
 */
export async function handleAction(client, action, payload) {
  const { adminPin, ...rest } = payload || {};

  // PIN-less dev mode: skip adminPin verification in local dev
  // (the production Cloud Function enforces PIN via requireAdminPin middleware)

  switch (action) {
    // ── Stats ──
    case "getAdminStats": {
      const { data: profiles, error: profErr } = await client
        .from("profiles")
        .select("id, subscription_tier, email");
      if (profErr) throw profErr;

      const { data: trades, error: tradeErr } = await client
        .from("trades")
        .select("id, pnl");
      if (tradeErr) throw tradeErr;

      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.filter(
        (p) => p.subscription_tier !== "free" && p.subscription_tier !== null,
      ).length || 0;
      const proUsers = profiles?.filter(
        (p) => p.subscription_tier === "pro",
      ).length || 0;
      const eliteUsers = profiles?.filter(
        (p) => p.subscription_tier === "elite",
      ).length || 0;
      const starterUsers = profiles?.filter(
        (p) => p.subscription_tier === "starter",
      ).length || 0;

      return {
        totalUsers,
        activeUsers,
        proUsers,
        eliteUsers,
        starterUsers,
        totalTrades: trades?.length || 0,
        totalPnl: trades?.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0) || 0,
      };
    }

    case "getTradesSummary": {
      const { data: trades, error } = await client
        .from("trades")
        .select("pnl, outcome");
      if (error) throw error;

      const totalTrades = trades?.length || 0;
      // Winning trades are those with positive PnL, not just 'tp' outcomes
      const wins = trades?.filter((t) => (Number(t.pnl) || 0) > 0).length || 0;
      const losses = totalTrades - wins;
      const totalPnl = trades?.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0) || 0;
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

      return { totalTrades, totalPnl, winRate, wins, losses };
    }

    // ── Users ──
    case "getAllUsers": {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    }

    case "getAllUsersWithSubs": {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    }

    // ── User Moderation ──
    // Note: Firebase Auth operations (disable/enable/delete user) are
    // skipped locally — no Firebase emulator is running. The audit events
    // are written to Supabase `user_moderation_events` (mirrors Firestore
    // `user_moderation_events` in production).
    case "banUser": {
      const { uid, reason, adminUid } = rest;
      if (!uid) throw new Error("uid required");
      if (adminUid && uid === adminUid) throw new Error("Cannot ban your own account");
      const safeReason = String(reason ?? "").slice(0, 280);
      const now = new Date().toISOString();
      const { error: profErr } = await client
        .from("profiles")
        .update({
          banned: true,
          banned_at: now,
          banned_reason: safeReason,
          banned_by: String(adminUid ?? "admin").slice(0, 64),
          status: "inactive",
        })
        .eq("id", uid);
      if (profErr) throw profErr;
      // Audit event
      await client.from("user_moderation_events").insert({
        type: "ban",
        user_id: uid,
        admin_uid: adminUid ?? null,
        reason: safeReason,
        created_at: now,
      });
      return { ok: true };
    }

    case "unbanUser": {
      const { uid } = rest;
      if (!uid) throw new Error("uid required");
      const now = new Date().toISOString();
      const { error: profErr } = await client
        .from("profiles")
        .update({
          banned: false,
          banned_at: null,
          banned_reason: null,
          banned_by: null,
          status: "active",
        })
        .eq("id", uid);
      if (profErr) throw profErr;
      await client.from("user_moderation_events").insert({
        type: "unban",
        user_id: uid,
        created_at: now,
      });
      return { ok: true };
    }

    case "suspendUser": {
      const { uid, reason, adminUid } = rest;
      if (!uid) throw new Error("uid required");
      if (adminUid && uid === adminUid) throw new Error("Cannot suspend your own account");
      const safeReason = String(reason ?? "").slice(0, 280);
      const now = new Date().toISOString();
      const { error } = await client
        .from("profiles")
        .update({
          status: "suspended",
          suspended_at: now,
          suspended_reason: safeReason,
          suspended_by: String(adminUid ?? "admin").slice(0, 64),
        })
        .eq("id", uid);
      if (error) throw error;
      return { ok: true };
    }

    case "reactivateUser": {
      const { uid } = rest;
      if (!uid) throw new Error("uid required");
      const { error } = await client
        .from("profiles")
        .update({
          status: "active",
          suspended_at: null,
          suspended_reason: null,
          suspended_by: null,
        })
        .eq("id", uid);
      if (error) throw error;
      return { ok: true };
    }

    case "updateUserProfile": {
      const { uid, updates } = rest;
      if (!uid || !updates) throw new Error("uid + updates required");

      // ── Split updates: profile fields vs subscription fields ──
      // "plan" must sync to BOTH profiles.subscription_tier, profiles.plan
      // (colonne legacy lue par l'app user via COALESCE) AND subscriptions.plan
      const SUB_FIELDS = new Set(["plan", "subscriptionStatus", "subscriptionStatusOverride", "subscription_status"]);
      const profUpdates = {};
      const subUpdates = {};
      for (const [k, v] of Object.entries(updates)) {
        if (SUB_FIELDS.has(k)) {
          if (k === "subscriptionStatus" || k === "subscriptionStatusOverride" || k === "subscription_status") {
            subUpdates.status = v;
            // Le statut d'abonnement ne touche PAS profiles.status
            // (profiles.status = statut du compte : active/suspended/banned)
          } else if (k === "plan") {
            subUpdates.plan = v;
            profUpdates.subscription_tier = v; // colonne moderne
            profUpdates.plan = v; // colonne legacy lue par l'app user
          } else {
            subUpdates[k] = v;
          }
        } else {
          // Normalise le statut de compte en minuscules (CHECK constraint:
          // active/inactive/suspended/banned — "BANNED" ou "Suspended" échoueraient)
          if (k === "status" && typeof v === "string") {
            profUpdates[k] = v.toLowerCase();
          } else {
            profUpdates[k] = v;
          }
        }
      }

      // Update profiles (only profile-owned columns)
      if (Object.keys(profUpdates).length > 0) {
        const { data: updatedProfiles, error: profErr } = await client
          .from("profiles")
          .update(profUpdates)
          .eq("id", uid)
          .select();
        if (profErr) throw profErr;
      }

      // Sync to subscriptions if plan or status changed.
      // Supabase JS client upsert needs a unique constraint on the column.
      // The subscriptions table has UNIQUE(user_id) but the REST API
      // doesn't always resolve onConflict correctly. Use raw fetch as fallback.
      if (Object.keys(subUpdates).length > 0) {
        const subPayload = { user_id: uid, ...subUpdates };
        let subErr = null;
        // Try upsert first
        const { error: upsertErr } = await client
          .from("subscriptions")
          .upsert(subPayload, { onConflict: "user_id" });
        subErr = upsertErr;
        // Fallback: try insert if the row doesn't exist
        if (subErr && subErr.message?.includes("ON CONFLICT")) {
          const { data: existing } = await client
            .from("subscriptions")
            .select("user_id")
            .eq("user_id", uid)
            .maybeSingle();
          if (existing) {
            const { error: updErr } = await client
              .from("subscriptions")
              .update(subUpdates)
              .eq("user_id", uid);
            subErr = updErr;
          } else {
            const { error: insErr } = await client
              .from("subscriptions")
              .insert(subPayload);
            subErr = insErr;
          }
        }
        if (subErr) {
          console.warn(`[dev-supabase-direct] Subscription sync failed for ${uid}:`, subErr.message);
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
      const { data, error } = await client
        .from("user_moderation_events")
        .select("*")
        .eq("user_id", rest.uid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }

    // ── Trades ──
    case "getAllTrades": {
      const { data, error } = await client
        .from("trades")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(rest.limit || 100);
      if (error) throw error;
      return data || [];
    }

    // ── Table browser ──
    case "listTable": {
      const { data, error } = await client
        .from(rest.tableName)
        .select("*")
        .limit(rest.limit || 50);
      if (error) throw error;
      const rows = data || [];
      if (rest.tableName === "system_config") {
        return rows.map((row) => ["payment_private_key", "suby_api_key", "suby_webhook_secret"].includes(row?.key)
          ? { ...row, value: null, redacted: true }
          : row);
      }
      return rows;
    }

    case "updateRow": {
      const { tableName, idColumn, idValue, updates } = rest;
      if (!tableName || !idColumn || idValue === undefined || !updates) {
        throw new Error("Paramètres requis : tableName, idColumn, idValue, updates");
      }
      // Coercition de types via le schéma (array / json / scalar)
      const schema = await loadSchemaCache();
      const cols = schema[tableName] || {};
      const payload = {};
      for (const [k, v] of Object.entries(updates)) {
        // undefined / chaîne vide → on ignore (évite de crasher sur les
        // colonnes array/jsonb quand on efface un champ du Data Browser)
        if (v === undefined || v === "") continue;
        const type = cols[k];
        if (type === "array" && !Array.isArray(v)) {
          payload[k] = [v];
        } else if (type === "json" && typeof v === "string") {
          try {
            payload[k] = JSON.parse(v);
          } catch {
            payload[k] = v;
          }
        } else {
          payload[k] = v;
        }
      }
      if (Object.keys(payload).length === 0) return { ok: true, updated: false };
      const { data, error } = await client
        .from(tableName)
        .update(payload)
        .eq(idColumn, idValue)
        .select();
      if (error) throw error;
      const matched = (data?.length ?? 0) > 0;
      return { ok: true, updated: matched, row: data?.[0] ?? null };
    }

    case "deleteRow": {
      const { tableName, idColumn, idValue } = rest;
      if (!tableName || !idColumn || idValue === undefined) {
        throw new Error("Paramètres requis : tableName, idColumn, idValue");
      }
      const { error } = await client
        .from(tableName)
        .delete()
        .eq(idColumn, idValue);
      if (error) throw error;
      return { ok: true };
    }

    case "insertRow": {
      const { tableName, data } = rest;
      if (!tableName || !data) {
        throw new Error("Paramètres requis : tableName, data");
      }
      const { data: inserted, error } = await client
        .from(tableName)
        .insert(data)
        .select();
      if (error) throw error;
      return inserted || [];
    }

    // ── Config ──
    case "getPaymentConfig": {
      const { data, error } = await client
        .from("system_config")
        .select("key,value")
        .in("key", ["payment_merchant_id", "payment_private_key", "payment_sandbox"]);
      if (error) throw error;
      const values = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
      return {
        merchantId: values.payment_merchant_id || "",
        hasPrivateKey: Boolean(values.payment_private_key),
        sandbox: values.payment_sandbox !== "false",
      };
    }

    case "getPayoutConfig": {
      const { data, error } = await client
        .from("system_config")
        .select("key,value")
        .in("key", ["payout_wallet_address", "payout_currency", "payout_network"]);
      if (error) throw error;
      const values = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
      return {
        walletAddress: values.payout_wallet_address || "",
        currency: values.payout_currency || "USDT",
        network: values.payout_network || "TRON",
      };
    }

    case "getDiscordInviteLink": {
      const { data, error } = await client
        .from("system_config")
        .select("value")
        .eq("key", "discord_invite_link")
        .maybeSingle();
      if (error) throw error;
      return { link: data?.value || "" };
    }

    case "setPaymentConfig": {
      const { merchantId, privateKey, sandbox } = rest;
      const upsert = (k, v) => client.from("system_config").upsert({ key: k, value: String(v ?? "") }, { onConflict: "key" });
      const writes = [upsert("payment_merchant_id", merchantId), upsert("payment_sandbox", sandbox)];
      if (privateKey) writes.push(upsert("payment_private_key", privateKey));
      await Promise.all(writes);
      return { ok: true };
    }

    case "setPayoutConfig": {
      const { walletAddress, currency, network } = rest;
      const upsert = (k, v) =>
        client.from("system_config").upsert({ key: k, value: String(v ?? "") }, { onConflict: "key" });
      await Promise.all([
        upsert("payout_wallet_address", walletAddress),
        upsert("payout_currency", currency),
        upsert("payout_network", network),
      ]);
      return { ok: true };
    }

    case "setDiscordInviteLink": {
      const { link } = rest;
      const { error } = await client
        .from("system_config")
        .upsert({ key: "discord_invite_link", value: String(link ?? "") }, { onConflict: "key" });
      if (error) throw error;
      return { ok: true };
    }

    case "getSystemSetting": {
      if (["payment_private_key", "suby_api_key", "suby_webhook_secret"].includes(rest.key)) return { value: null, redacted: true };
      const { data, error } = await client
        .from("system_config")
        .select("value")
        .eq("key", rest.key)
        .maybeSingle();
      if (error) throw error;
      return data || { value: null };
    }

    case "getAllSystemSettings": {
      const { data, error } = await client
        .from("system_config")
        .select("key,value");
      if (error) throw error;
      return (data || []).reduce((settings, row) => {
        if (row?.key && row.key !== "payment_private_key" && row.key !== "suby_api_key" && row.key !== "suby_webhook_secret") settings[row.key] = row.value;
        return settings;
      }, {});
    }

    case "setSystemSetting": {
      const { error } = await client
        .from("system_config")
        .upsert({ key: rest.key, value: rest.value }, { onConflict: "key" });
      if (error) throw error;
      return { ok: true };
    }

    // ── Campaign ──
    case "listCampaignEvents": {
      const { data, error } = await client
        .from("campaign_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(rest.limit || 100);
      if (error) throw error;
      return data || [];
    }

    case "createCampaignEvent": {
      const { event } = rest;
      if (!event || !event.title) throw new Error("event.title required");
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("campaign_events")
        .insert({
          title: String(event.title).slice(0, 200),
          description: String(event.description ?? "").slice(0, 2000),
          location: String(event.location ?? "").slice(0, 200),
          link: String(event.link ?? "").slice(0, 500),
          status: event.status ?? "upcoming",
          type: event.type ?? "campaign",
          created_at: now,
          updated_at: now,
        })
        .select();
      if (error) throw error;
      return { id: data?.[0]?.id, ok: true };
    }

    case "deleteCampaignEvent": {
      const { id } = rest;
      if (!id) throw new Error("id required");
      const { error } = await client
        .from("campaign_events")
        .delete()
        .eq("id", String(id));
      if (error) throw error;
      return { ok: true };
    }

    case "toggleCampaignEventStatus": {
      const { id, currentStatus } = rest;
      if (!id) throw new Error("id required");
      const newStatus = currentStatus === "cancelled" ? "active" : "cancelled";
      const { error } = await client
        .from("campaign_events")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", String(id));
      if (error) throw error;
      return { ok: true, status: newStatus };
    }

    // ── Audit ──
    case "getAuditLogs": {
      const { data, error } = await client
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(rest.limit || 50);
      if (error) throw error;
      return data || [];
    }

    // ── Support Tickets ──
    case "listSupportTickets": {
      const { status, limit: ticketLimit } = rest || {};
      let query = client
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      query = query.limit(ticketLimit || 100);
      const { data, error } = await query;
      if (error) {
        if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
          throw new Error("TABLE_MISSING: La table support_tickets n'existe pas. Applique la migration SQL.");
        }
        throw error;
      }
      return data || [];
    }

    case "updateSupportTicket": {
      const { id, updates } = rest;
      if (!id) throw new Error("id required");
      const upd = { ...updates, updated_at: new Date().toISOString() };
      const { data, error } = await client
        .from("support_tickets")
        .update(upd)
        .eq("id", id)
        .select();
      if (error) throw error;
      return data?.[0] || { ok: true };
    }

    case "createSupportTicket": {
      const { ticket } = rest;
      if (!ticket) throw new Error("ticket required");
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("support_tickets")
        .insert({
          user_id: ticket.user_id || null,
          user_email: ticket.user_email || "",
          user_name: ticket.user_name || "",
          subject: ticket.subject || "Sans sujet",
          status: ticket.status || "open",
          priority: ticket.priority || "normal",
          messages: ticket.messages || [],
          replies: [],
          created_at: now,
          updated_at: now,
        })
        .select();
      if (error) throw error;
      return data?.[0] || { id: "local-" + Date.now() };
    }

    case "deleteSupportTicket": {
      const { id } = rest;
      if (!id) throw new Error("id required");
      const { error } = await client
        .from("support_tickets")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { ok: true };
    }

    // ── Apply Migrations ──
    case "applyMigrations": {
      return applyMigrations();
    }

    case "checkMigrations": {
      return checkMigrationStatus(client);
    }

    default:
      throw new Error(`Action non supportée en local: ${action}`);
  }
}

/**
 * Apply all pending Supabase migrations using pg direct connection.
 * Reads .sql files from the remix project's supabase/migrations directory.
 */
async function applyMigrations() {
  const migrationsDir = "/home/rxfxtuna/remix-of-trade-journal-pro/supabase/migrations";
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    return { applied: 0, total: 0, files: [], message: "Aucune migration trouvée." };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || "";

  if (!projectRef) {
    throw new Error("VITE_SUPABASE_URL not configured.");
  }

  // Try loading pg from available node_modules
  let pg;
  const pgPaths = [
    "pg",
    "/home/rxfxtuna/remix-of-trade-journal-pro/node_modules/pg",
  ];
  for (const pgPath of pgPaths) {
    try {
      pg = await import(pgPath);
      if (pg.default) pg = pg.default;
      break;
    } catch { /* continue */ }
  }

  if (!pg || !pg.Client) {
    const results = files.map((f) => ({
      file: f, status: "skipped",
      error: "Module pg non disponible. Installe-le: cd rxfx-logbook-admin && npm install pg",
    }));
    return { applied: 0, skipped: files.length, total: files.length, files: results,
      message: "Module 'pg' non disponible. Installe-le avec npm." };
  }

  // Connect via pooler
  let pgClient = null;
  let connectError = null;

  const cfg = { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543,
    user: `postgres.${projectRef}`, password: projectRef, database: "postgres",
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 };

  const c = new pg.Client(cfg);
  try { await c.connect(); pgClient = c; } catch (err) { connectError = err.message; try { await c.end(); } catch {} }

  if (!pgClient) {
    const results = files.map((f) => ({
      file: f, status: "skipped",
      error: "Connexion DB impossible. Applique manuellement : https://supabase.com/dashboard/project/" + projectRef + "/sql/new",
    }));
    return { applied: 0, skipped: files.length, total: files.length, files: results,
      error: `Connexion PostgreSQL échouée (${connectError}). Utilise le Dashboard Supabase.`,
      message: "Connexion DB impossible. Applique les migrations via le Dashboard Supabase." };
  }

  // Execute each migration file as a single statement
  // (avoids corrupting DO $$ ... END$$ blocks and CREATE FUNCTION bodies)
  const results = [];
  let applied = 0;
  let skipped = 0;

  try {
    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      try {
        await pgClient.query(content);
        results.push({ file, status: "applied" });
        applied++;
      } catch (stmtErr) {
        const msg = stmtErr.message || "";
        if (msg.includes("already exists") || msg.includes("duplicate key")) {
          results.push({ file, status: "already_applied" });
          applied++;
        } else {
          results.push({ file, status: "error", error: msg.slice(0, 200) });
          skipped++;
        }
      }
    }
  } finally {
    try { await pgClient.end(); } catch {}
  }

  return { applied, skipped, total: files.length, files: results,
    message: `${applied} migrations appliquées, ${skipped} erreurs sur ${files.length} fichiers.` };
}

/** Check which key migrations are already applied. */
async function checkMigrationStatus(client) {
  const checks = [
    { name: "ai_score (trades)", table: "trades", col: "ai_score" },
    { name: "trader_progress", table: "trader_progress", col: "id" },
    { name: "coach_memory", table: "coach_memory", col: "id" },
    { name: "partnership_applications", table: "partnership_applications", col: "id" },
    { name: "outcome (trades)", table: "trades", col: "outcome" },
  ];
  const statuses = [];
  for (const check of checks) {
    try {
      const { error } = await client.from(check.table).select(check.col).limit(0);
      statuses.push({ name: check.name, ok: !error, error: error?.message });
    } catch (e) {
      statuses.push({ name: check.name, ok: false, error: e.message?.slice(0, 100) });
    }
  }
  return statuses;
}

export default function devSupabaseDirectPlugin() {
  let supabaseAdmin = null;

  function getServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  }

  function getClient() {
    const key = getServiceKey();
    const url = process.env.VITE_SUPABASE_URL || "";
    if (!supabaseAdmin && url && key) {
      supabaseAdmin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return supabaseAdmin;
  }

  return {
    name: "dev-supabase-direct",
    configureServer(server) {
      const key = getServiceKey();
      if (!key) {
        console.log(
          "[dev-supabase-direct] SUPABASE_SERVICE_ROLE_KEY not set — skipping. Dashboard will show degraded mode.",
        );
        return;
      }

      console.log("[dev-supabase-direct] ✅ Activated — direct Supabase proxy at /api/supabase-direct");

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/supabase-direct" || req.method !== "POST") {
          return next();
        }

        // Parse JSON body
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const { action, payload } = JSON.parse(body);
            const client = getClient();
            if (!client) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                error: "Supabase non configuré (SUPABASE_SERVICE_ROLE_KEY manquant)",
                degraded: true,
              }));
              return;
            }
            const result = await handleAction(client, action, payload);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ data: result }));
          } catch (err) {
            console.error("[dev-supabase-direct] Error:", err.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              error: err.message,
              degraded: false,
            }));
          }
        });
      });
    },
  };
}
