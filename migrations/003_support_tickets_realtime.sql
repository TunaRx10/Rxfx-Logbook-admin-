-- =========================================================================
-- RxFx Logbook Admin — Migration 003
-- Active Supabase Realtime (canal postgres_changes) sur `support_tickets`.
-- Remplace le polling 8s de `subscribeToSupportTickets` par un push temps réel.
--
-- Côté serveur : Active la réplication logique sur la table, force le
-- REPLICA IDENTITY à FULL (pour récupérer l'ancienne valeur sur UPDATE/DELETE),
-- publie la table dans la publication `supabase_realtime`, et GRANT le
-- rôle `supabase_realtime_admin` sur la table.
--
-- Côté client : la policy RLS "Admins manage all tickets" + "Users read own
-- tickets" assure que chaque JWT connecté ne voit que les rows qu'il a le
-- droit de SELECT (Lesrows évincées par RLS ne déclenchent PAS le canal).
--
-- À coller dans Supabase Dashboard → SQL Editor.
-- =========================================================================

-- 1. Force REPLICA IDENTITY à FULL pour que UPDATE/DELETE envoient l'ancienne
--    valeur (sans ça, payload.old est NULL et le diff côté frontend devient
--    impossible).
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

-- 2. Publication `supabase_realtime` : permet à la couche Realtime de
--    capturer les WAL events de la table. Si déjà présente → no-op.
DO $$
BEGIN
  -- Si la table n'est PAS déjà dans la publication, on l'ajoute.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
END $$;

-- 3. GRANT explicite pour le worker Realtime (le rôle interne utilisé par
--    la couche Realtime). Sans ça, l'insert est OK côté RLS mais le push
--    WebSocket échoue avec "permission denied for table support_tickets".
GRANT USAGE ON SCHEMA public TO supabase_realtime_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets
  TO supabase_realtime_admin;

-- 4. Note : RLS reste appliqué au push (Supabase Realtime respecte RLS).
--    Les admins voient donc TOUS les events (policy "Admins manage all
--    tickets" USING is_admin()), les users voient uniquement les events
--    de leurs propres tickets (policy "Users read own tickets").

-- 5. Refresh du cache PostgREST + publication Realtime.
NOTIFY pgrst, 'reload schema';
