-- =========================================================================
-- RxFx Logbook Admin — Migration 002
-- Tables manquantes référencées par les proxy methods de `supabase-admin.js`
-- mais absentes du schéma principal (001) :
--   • support_tickets  (SupportPage.jsx)
--   • referrals        (ReferralsPage.jsx)
--   • payout_requests  (ReferralsPage.jsx)
--   • system_settings  (SettingsPage.jsx)
--   • ALTER campaign_events  → ajout start_date / end_date (CalendarPage)
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS partout, ADD COLUMN IF NOT EXISTS,
-- DROP/CREATE policies, ON CONFLICT DO NOTHING. À coller dans Supabase
-- Dashboard → SQL Editor.
-- =========================================================================

-- ── 1. support_tickets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  user_name   TEXT,
  subject     TEXT,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','resolved','closed')),
  -- messages = conversation bot ↔ user (admin peut aussi écrire dedans)
  -- chaque entrée : {role: 'user'|'assistant', text: str, ts: ISO}
  messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- replies = réponses manuelles de l'admin (chat one-shot)
  -- chaque entrée : {from: 'admin', text: str, timestamp: ISO}
  replies     JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user   ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated ON public.support_tickets(updated_at DESC);

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Un user peut lire et créer ses propres tickets.
DROP POLICY IF EXISTS "Users read own tickets" ON public.support_tickets;
CREATE POLICY "Users read own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own tickets" ON public.support_tickets;
CREATE POLICY "Users insert own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin lit/met à jour tout.
DROP POLICY IF EXISTS "Admins manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins manage all tickets" ON public.support_tickets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ── 2. referrals ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer_email  TEXT,
  referred_email  TEXT,
  referred_name   TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','pro','elite')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','canceled')),
  payout_status   TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payout_status IN ('unpaid','paid','rejected')),
  payout_amount   NUMERIC(10,2) DEFAULT 0,
  payout_date     TIMESTAMPTZ,
  tier_reward     TEXT,
  tier_threshold  INTEGER,
  tier_awarded_at TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer     ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status       ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_payout       ON public.referrals(payout_status);
CREATE INDEX IF NOT EXISTS idx_referrals_created      ON public.referrals(created_at DESC);

DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own referrals" ON public.referrals;
CREATE POLICY "Users read own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Admins gèrent tout.
DROP POLICY IF EXISTS "Admins manage referrals" ON public.referrals;
CREATE POLICY "Admins manage referrals" ON public.referrals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ── 3. payout_requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer_email  TEXT,
  payout_address  TEXT,                      -- crypto wallet (USDT TRC-20…)
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USDT'
                    CHECK (currency IN ('USDT','USDC','BTC','ETH','EUR')),
  active_count    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','paid','rejected','canceled')),
  approved_amount NUMERIC(10,2),
  approved_at     TIMESTAMPTZ,
  paid_amount     NUMERIC(10,2),
  paid_at         TIMESTAMPTZ,
  rejected_reason TEXT,
  rejected_at     TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_referrer  ON public.payout_requests(referrer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status    ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created   ON public.payout_requests(created_at DESC);

DROP TRIGGER IF EXISTS update_payout_requests_updated_at ON public.payout_requests;
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payout requests" ON public.payout_requests;
CREATE POLICY "Users read own payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users create own payout requests" ON public.payout_requests;
CREATE POLICY "Users create own payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Admins manage payout requests" ON public.payout_requests;
CREATE POLICY "Admins manage payout requests" ON public.payout_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ── 4. system_settings (clé/valeur JSON) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les paramètres globaux (lecture publique Ok pour
-- un panneau admin — déjà admin-only auth dans l'app).
DROP POLICY IF EXISTS "Anyone reads system_settings" ON public.system_settings;
CREATE POLICY "Anyone reads system_settings" ON public.system_settings
  FOR SELECT USING (true);

-- Seuls les admins peuvent écrire.
DROP POLICY IF EXISTS "Admins write system_settings" ON public.system_settings;
CREATE POLICY "Admins write system_settings" ON public.system_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ── 5. Seed des valeurs par défaut ─────────────────────────────────────
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES
  ('maintenance_mode', 'false'::jsonb, 'Mode maintenance global (true/false)', now()),
  ('auto_backup',       'true'::jsonb,  'Backup automatique toutes les 24h',     now()),
  ('global_cdn',        'true'::jsonb,  'Active la distribution CDN globale',     now()),
  ('enforce_2fa',       'true'::jsonb,  'Force la 2FA pour tous les admins',      now()),
  ('session_timeout',   '"1 hour"'::jsonb, 'Durée session avant logout auto',   now()),
  ('retention_policy',  '"90 Days"'::jsonb, 'Politique de rétention des logs',   now()),
  ('payment_config',    '{"sandbox": true}'::jsonb, 'Credentials Suby/Stripe (merchant_id + private_key côté serveur uniquement)', now()),
  ('discord_invite_link','"https://discord.gg/your-discord-invite"'::jsonb, 'Lien d''invitation Discord public', now())
ON CONFLICT (key) DO NOTHING;


-- ── 5b. ALTER campaign_events → ajout colonnes date calendrier ───────
-- CalendarPage.jsx lit `start_date` / `end_date` / `link` mais ces colonnes
-- manquaient au schéma principal (001). Ajout en TIMESTAMPTZ nullable pour
-- ne pas casser les rows existantes et garder le code calendrier fonctionnel.
ALTER TABLE public.campaign_events
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link       VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_campaign_events_start
  ON public.campaign_events(start_date)
  WHERE start_date IS NOT NULL;


-- ── 6. Refresh PostgREST schema cache ──────────────────────────────────
NOTIFY pgrst, 'reload schema';
