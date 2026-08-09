/**
 * RxFx Admin — Drizzle ORM Schema
 * Tables referenced by the admin API (api/supabase-direct.ts).
 * Mirrors the Trade Journal Pro approach: direct PG + Drizzle,
 * with Supabase REST API as fallback when DATABASE_URL is unavailable.
 */
import { pgTable, text, boolean, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";

// ── Sessions (mirrors Trade Journal Pro's rxfx_sessions) ──
export const rxfxSessions = pgTable("rxfx_sessions", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

// ── Admins ──
export const admins = pgTable("admins", {
  id: text("id").primaryKey(),
  role: text("role").default("admin"),
  status: text("status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Profiles ──
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email"),
  display_name: text("display_name"),
  role: text("role").default("user"),
  plan: text("plan"),
  subscription_tier: text("subscription_tier"),
  status: text("status").default("active"),
  banned: boolean("banned").default(false),
  banned_at: timestamp("banned_at"),
  banned_reason: text("banned_reason"),
  suspended_at: timestamp("suspended_at"),
  suspended_reason: text("suspended_reason"),
  created_at: timestamp("created_at").defaultNow(),
  avatar_url: text("avatar_url"),
  username: text("username"),
  balance: numeric("balance").default("0"),
  currency: text("currency").default("USD"),
});

// ── Subscriptions ──
export const subscriptions = pgTable("subscriptions", {
  user_id: text("user_id").primaryKey(),
  plan: text("plan").default("free"),
  status: text("status").default("inactive"),
  current_period_end: timestamp("current_period_end"),
});

// ── System Config ──
export const systemConfig = pgTable("system_config", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// ── Trades ──
export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  pnl: numeric("pnl").default("0"),
  opened_at: timestamp("opened_at").defaultNow(),
  symbol: text("symbol"),
  type: text("type"),
  volume: numeric("volume"),
  entry_price: numeric("entry_price"),
  exit_price: numeric("exit_price"),
  notes: text("notes"),
});

// ── Campaign Events ──
export const campaignEvents = pgTable("campaign_events", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  title: text("title"),
  status: text("status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  data: jsonb("data"),
});

// ── Support Tickets ──
export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id"),
  subject: text("subject"),
  status: text("status").default("open"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
  data: jsonb("data"),
});

// ── User Moderation Events ──
export const userModerationEvents = pgTable("user_moderation_events", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  user_id: text("user_id").notNull(),
  admin_uid: text("admin_uid"),
  action: text("action"),
  reason: text("reason"),
  created_at: timestamp("created_at").defaultNow(),
});

// ── All allowed tables (security allowlist) ──
export const ALLOWED_TABLES = new Set([
  "admins", "profiles", "subscriptions", "trades", "logs", "audit_logs",
  "payment_logs", "system_config", "campaign_events", "mail_queue",
  "calendar_events", "support_tickets", "referrals", "payout_requests",
  "shop_products", "shop_orders", "certification_applications",
  "application_history", "partnership_applications", "user_moderation_events",
]);

export const SENSITIVE_KEYS = new Set(["payment_private_key", "suby_api_key", "suby_webhook_secret"]);
