# RxFx Logbook — Table mapping (schema ↔ app code)

> **État actuel (vérifié via probe Supabase direct)** : les 16 tables du nouveau schéma SQL existent déjà en production.

> **Live DB** : `https://owtfumkijdasokokfmsp.supabase.co`

---

## ✅ 1. Tables existantes (16/16)

Toutes ces tables sont **créées et interrogables** :

| # | Table | Rôle métier | Source SQL |
|---|-------|-------------|------------|
| 1 | `profiles` | Utilisateurs (id, role, status, sub_tier) | `§3` |
| 2 | `rxfx_sessions` | Sessions jeton admin (PIN-gated) | `§4` |
| 3 | `trades` | Trades utilisateurs (40+ colonnes) | `§5` |
| 4 | `subscriptions` | Plans payants (Stripe + Suby) | `§6` |
| 5 | `journal_entries` | Journal de bord + mood | `§7` |
| 6 | `audit_log` | Logs d'action admin (modération, paiements) | `§8` |
| 7 | `trader_progress` | Index score du Coach IA | `§9` |
| 8 | `coach_memory` | Historique conversations IA | `§10` |
| 9 | `shop_products` | Catalogue boutique | `§11` |
| 10 | `shop_orders` | Commandes boutique | `§11` |
| 11 | `campaign_events` | Calendrier campagnes promo | `§12` |
| 12 | `partnership_applications` | Candidatures part. individuelles | `§13` |
| 13 | `certification_applications` | Candidatures certification | `§13` |
| 14 | `user_preferences` | Préférences UI/dashboard/routines | `§14` |
| 15 | `partnership_applications_corp` | Candidatures entreprises | `§15` |
| 16 | `rxfx_config` | Risk per trade, account size, trader_type | `§16` |

---

## ❌ 2. Table fantôme (n'existe pas dans la DB vivante)

| Table | Demandée par | Statut |
|-------|--------------|--------|
| `admins` | `AuthContext.jsx:29` → `.from('admins').select('role, status')` | ❌ HTTP 500 |

> **Fix nécessaire** : supprimer le `.from('admins')`. Le rôle admin se lit désormais directement dans `profiles.role` (cf. `AuthContext.jsx:37` qui le fait déjà en fallback). Le code fait d'abord une requête sur `admins` qui plante **avant** de tester `profiles`.

---

## 🗺️ 3. Table ↔ Page ↔ Méthode proxy

### Calls directs au client Supabase
| Fichier | Méthode | Table | Note |
|---------|---------|-------|------|
| `src/context/AuthContext.jsx:29` | `.from('admins')` | ❌ table inexistante | À supprimer |
| `src/context/AuthContext.jsx:37` | `.from('profiles')` | `profiles` | OK (fallback déjà en place) |

### Calls via `lib/supabase-admin.js` (proxy → Cloud Function → service_role)
| Méthode proxy | Tables lues/écrites | Utilisée par |
|---------------|---------------------|--------------|
| `getAdminStats()` | `profiles` (count), `trades` (aggregates) | `AdminDashboard`, `WorkspaceSyncPage` |
| `getTradesSummary()` | `trades` (count, pnl, win rate) | `AdminDashboard` |
| `getAllUsers()` | `profiles` ORDER BY created_at | `AdminDashboard`, `CertificationsAdmin` |
| `getAllUsersWithSubs()` | `profiles` JOIN `subscriptions` | `UserDetailsPage`, `EmailBroadcastPage`, `IdentityPage`, `UsersPage` |
| `updateUserProfile(uid, updates)` | `profiles` UPDATE | `BillingPage` (densité accent etc) |
| `suspendUser / banUser / reactivateUser / unbanUser` | `profiles` UPDATE status | modération admin |
| `deleteUser(uid)` | `auth.users` DELETE (admin SDK) | modération |
| `getAllTrades(limit)` | `trades` SELECT | admin only |
| `getAuditLogs(limit)` | `audit_log` SELECT | LogsPage |
| `getPaymentConfig / setPaymentConfig` | (Firebase RTDB legacy, à vérifier) | `SettingsPage`, `BillingPage` |
| `getPayoutConfig / setPayoutConfig` | (idem) | `BillingPage` |
| `getDiscordInviteLink / set` | (idem) | `SettingsPage` |
| `getSystemSetting / setSystemSetting / getAllSystemSettings` | (idem) | `SettingsPage` |
| `listCampaignEvents(limit)` | `campaign_events` | `PromotionsPage` |
| `createCampaignEvent(e)` / `deleteCampaignEvent(id)` / `toggleCampaignEventStatus` | `campaign_events` INSERT/UPDATE/DELETE | `PromotionsPage`, `CalendarPage` |
| `listTable(tableName, limit)` | **dynamique** | partout |
| `insertRow(tableName, data)` | **dynamique** | `BoutiquePage`, `CalendarPage`, `ReferralsPage`, `CertificationsAdmin` |
| `updateRow(tableName, idCol, idVal, updates)` | **dynamique** | `BoutiquePage`, `CertificationsAdmin`, `PartnershipsAdmin`, `ReferralsPage` |
| `deleteRow(tableName, idCol, idVal)` | **dynamique** | `BoutiquePage`, `CalendarPage`, `CertificationsAdmin`, `PartnershipsAdmin` |

### Tables utilisées via `listTable(...)` string-based
| Table | Fichiers | But |
|-------|----------|-----|
| `campaign_events` | `CalendarPage`, `PromotionsPage` | Calendrier des promos |
| `subscriptions` | `BillingPage`, `CalendarPage` | Vue abonnements + cross-check events |
| `audit_log` | `ReferralsPage`, `CertificationsAdmin`, `PartnershipsAdmin` | Tracer les actions admin |
| `certification_applications` | `CertificationsAdmin` | Gestion des certifications |
| `partnership_applications` | `PartnershipsAdmin` | Candidatures partenariats |
| `shop_products` | `BoutiquePage` | Catalogue |
| `shop_orders` | `BoutiquePage` | Commandes |
| `trades` | `WorkspaceSyncPage` | Sync breathe |

---

## ⚠️ 4. Bugs latents — méthodes proxy qui ciblent des tables INEXISTANTES

Le schéma **n'a pas créé** ces tables, mais les méthodes proxy existent et cassent silencieusement :

| Méthode proxy | Table manquante | Fichier utilisateur |
|---------------|-----------------|---------------------|
| `listSupportTickets(status, limit)` | `support_tickets` | `SupportPage.jsx:49` |
| `createSupportTicket(ticket)` | `support_tickets` | `SupportPage.jsx` |
| `updateSupportTicket(id, updates)` | `support_tickets` | `SupportPage.jsx` |
| `deleteSupportTicket(id)` | `support_tickets` | `SupportPage.jsx` |
| `listReferrals(limit)` | `referrals` | `ReferralsPage.jsx:51` |
| `updateReferral(id, updates)` | `referrals` | `ReferralsPage.jsx` |
| `listPayoutRequests(limit)` | `payout_requests` | `ReferralsPage.jsx:52` |
| `updatePayoutRequest(id, updates)` | `payout_requests` | `ReferralsPage.jsx` |
| `getSystemSetting / setSystemSetting` | `system_settings` (legacy Firebase) | `SettingsPage.jsx` |

➡️ Ces méthodes proxy se résoudront par un 404 côté Cloud Function quand l'admin cliquera dessus. Deux choix :
- **(a)** Créer les tables manquantes avec un nouveau patch SQL (et conserver les hooks existants)
- **(b)** Réécrire les pages pour pointer sur des tables réelles (`coach_memory` pour support, `subscriptions`/`audit_log` pour payouts…)

---

## 🛠 5. Fix immédiat recommandé

**AuthContext.jsx → supprimer le `.from('admins')` parasite**

```diff
const { data: adminData, error: adminErr } = await supabase
-   .from('admins')
-   .select('role, status')
-   .eq('id', user.id)
-   .single();
-
-if (!adminErr && adminData?.status === 'active') return true;

const { data: profileData } = await supabase
   .from('profiles')
   .select('role')
   .eq('id', user.id)
   .single();

return profileData?.role === 'admin';
+ // (le `profiles.role` est la source unique de vérité)
```

Aussi enrichir `select('role')` → `select('role, status, subscription_tier')` si tu veux matcher le fallback KYC.

---

## 📋 6. Tables à utiliser par feature

| Feature / page | Tables à CALL |
|----------------|---------------|
| **Login admin** | `profiles` (via fetch de session Supabase standard) |
| **Dashboard global** | `profiles` (count), `trades` (agrégats) |
| **Stats trades** | `trades` |
| **Modération user** | `profiles` (UPDATE) + `audit_log` (INSERT) |
| **Billing / Subs** | `subscriptions` |
| **Calendar promo** | `campaign_events` |
| **Boutique** | `shop_products`, `shop_orders` |
| **Certifications** | `certification_applications` |
| **Partenariats** | `partnership_applications`, `partnership_applications_corp` |
| **Logs admin** | `audit_log` |
| **Coach IA** | `coach_memory`, `trader_progress` |
| **Referrals / Payouts** | ⚠️ table `referrals`/`payout_requests` MANQUANTE |
| **Support** | ⚠️ table `support_tickets` MANQUANTE |
| **Settings** | ⚠️ table `system_settings` MANQUANTE + fallback Firebase RTDB legacy |
| **rxfx_config** | `rxfx_config` (risk, account, trader_type) |
| **user_preferences** | `user_preferences` (visible_metrics, dashboard_layout, theme) |
| **Profile detail** | `profiles`, `subscriptions`, `trades`, `audit_log` (modération history) |
