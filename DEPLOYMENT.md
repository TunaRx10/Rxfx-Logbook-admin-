# Deployment Guide - RxFx Logbook Administrator

Follow these steps to deploy your administrative dashboard.

## 1. Firebase Initialization
If you haven't already, install the Firebase CLI and login:
```bash
npm install -g firebase-tools
firebase login
```

Initialize your project in the `rxfx-logbook-admin` directory:
```bash
cd rxfx-logbook-admin
firebase init
```
- Select: **Firestore**, **Functions**, **Hosting**, **Storage**.
- Use an existing project or create a new one.
- For Functions: Select **JavaScript**.
- For Hosting: Set public directory to **dist**. Configure as a single-page app: **Yes**.

## 2. Configuration
Update `src/firebase/config.js` with your project's Firebase configuration found in the Firebase Console (Project Settings > General > Your apps).

## 3. Deployment

### Backend (Cloud Functions & Rules)
```bash
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

### Suby.fi Webhook (every event)

The admin app hosts a single `subyWebhook` Cloud Function that handles
**every Suby v2 event** (CHECKOUT_*, PAYMENT_*, SUBSCRIPTION_*, including
refunds and chargebacks). Register it in your Suby dashboard:

1. **Deploy Functions first** (see above). The hosting rewrite for
   `/api/webhooks/suby` → `subyWebhook` is set automatically by
   `firebase.json`.
2. **Register the URL** in the Suby dashboard under
   Settings → Webhooks → Add endpoint:
   ```
   https://rxfx-logbook.fr.nf/api/webhooks/suby
   ```
   Tick every event family you want delivered (Subscriptions + Payments
   at minimum).
3. **Set the signing secret** in BOTH places:
   - Suby dashboard: the secret Suby generated for this endpoint.
   - Firebase Functions (must match — Suby signs with its secret; we
     verify with ours):
     ```bash
     firebase functions:secrets:set SUBY_WEBHOOK_SECRET
     # paste the same whsec_... value Suby dashboard showed you
     ```
4. **Apply Firestore rules**: `firebase deploy --only firestore:rules`
   so the new `suby_event_logs` / `suby_pending_users` collections are
   admin-only readable.

Supported event types (see `functions/suby-webhook.js` for the full
dispatch table):

| Family          | Events                                                                                            |
|-----------------|---------------------------------------------------------------------------------------------------|
| Checkout/Payment | `CHECKOUT_INITIATED`, `CHECKOUT_SUCCESS`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_SETTLED` |
| Refund/Chargeback | `PARTIAL_REFUNDED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK`                                    |
| Subscription     | `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_PAST_DUE`, `SUBSCRIPTION_EXPIRED` |

Unknown event types are acknowledged (HTTP 200) so Suby doesn't retry,
and an audit row is dropped into `suby_event_logs` so the dashboard can
spot patterns. Every event is also recorded in `suby_processed_events`
with state (`received → processing → processed | failed | duplicate`)
plus a `retryCount` so duplicate deliveries are visible.

### Suby Credentials (runtime rotation)

The admin SPA can enter and rotate the Suby **API key** and **webhook
secret** without redeploying Cloud Functions. They're stored in
Firestore (`suby_settings/{slot}`) encrypted with AES-256-GCM using a
master key held as a Firebase secret.

**First-time setup (one-time per environment):**

1. Generate a 32-byte master key, base64-encoded:
   ```bash
   openssl rand -base64 32
   ```
2. Configure it as a Firebase Functions secret:
   ```bash
   firebase functions:secrets:set SUBY_SECRETS_ENCRYPTION_KEY
   # paste the base64 value when prompted
   ```
3. Redeploy so the new SecretParam is bound at cold start:
   ```bash
   firebase deploy --only functions,firestore:rules
   ```
4. Open the admin SPA → Suby Settings page. Enter your Suby API key
   (`mk_test_…` / `mk_live_…`) and webhook secret (`whsec_…`). Hit
   "Tester la connexion" to confirm both round-trip end-to-end.

**Reading path (every cloud function call):**

```
   cache (60 s)  →  Firestore (decrypt)  →  process.env bootstrap
                                       ↓
                          webhook signature verifier
                       (accepts BOTH current + previous secret
                        for ~60 s after a rotation so in-flight
                        retries signed with the old secret still
                        validate)
```

**Rotation semantics:**

- New value is written to Firestore and the in-memory cache is updated.
- The OLD value stays in the cache's `previous` slot for one TTL
  (60 s), so webhooks signed with the old secret still validate.
- After the TTL, only the new secret is accepted. Old retries beyond
  this window return 401 and Suby replays them with the new signature.
- Each write is audit-logged in `security_alerts` with severity
  `warning` + a 4-byte fingerprint (NOT the secret itself).

**Removing a runtime-stored secret:**

Call `setSubySettings` with one of the two slots as the empty string,
or via the admin UI. The clear path removes the Firestore doc and
falls back to `process.env` if that bootstrap value is also present.

### Frontend (React App)
```bash
npm install
npm run build
firebase deploy --only hosting
```

## 4. Promotion to Admin
Since the dashboard is protected, you need to promote your first user to admin manually via the Firebase Admin SDK or by calling the `makeAdmin` function once from a secure environment (like the Firebase Console's Functions tab test feature).

### Example to promote via Node.js (Admin SDK):
```javascript
admin.auth().setCustomUserClaims(UID, { admin: true });
```

## 5. Security Note
Ensure that only trusted emails can be promoted to admin. The `makeAdmin` function currently checks if the *caller* is an admin. For the very first admin, you must set the claim manually.

## 6. Suby Checkout Links (Marketing / Email Campaigns)

The admin SPA has a dedicated **Checkout Links** page (under *Suby · Marketing*
in the sidebar) that surfaces the 4 EUR-priced Suby.fi hosted-checkout URLs
for copy-paste into email campaigns, social posts, affiliate messages, or
QR codes. The same URLs are baked into the consumer app's
`SUBY_PAYMENT_LINKS` map (see
`remix-of-trade-journal-pro/src/lib/suby.types.ts`) so the `/checkout`
fast-path redirects users straight to the matching hosted page.

### The 4 links (keep both files in sync if a URL ever rotates)

| Plan              | Price         | Suby URL                                              |
|-------------------|---------------|-------------------------------------------------------|
| Pro · Mensuel     | 29,99 €/mois  | `https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3`  |
| Pro · Trimestriel | 83,99 €/3 mois | `https://app.suby.fi/p/pro_ue01q18pg2jrqwcf6y30w4kq` |
| Elite · Mensuel   | 99,99 €/mois  | `https://app.suby.fi/p/pro_cbqaw8409drbd1o702c1amih`  |
| Elite · Trimestriel | 279,99 €/3 mois | `https://app.suby.fi/p/pro_m0ocolwx3hcxch2pa66n5ygm` |

### Quick copy-paste cheat-sheet (plain text)

**Pro · 29,99 €/mois**
```
https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3
```

**Pro · 83,99 € / 3 mois (−7%)**
```
https://app.suby.fi/p/pro_ue01q18pg2jrqwcf6y30w4kq
```

**Elite · 99,99 €/mois**
```
https://app.suby.fi/p/pro_cbqaw8409drbd1o702c1amih
```

**Elite · 279,99 € / 3 mois (−7%)**
```
https://app.suby.fi/p/pro_m0ocolwx3hcxch2pa66n5ygm
```

### Email blast template (FR)

> **Objet :** 🧠 Ton journal de trading, en pilote automatique — RxFx Logbook
>
> Salut {{firstName}},
>
> On a lancé un truc qui change la donne pour les traders qui veulent
> arrêter de se raconter des histoires : **RxFx Logbook**.
>
> 📒  Webhook RXFX → tes trades arrivent tout seuls dans le journal
> 🧭  Radar Analysis → ton type de trader (pas celui que tu crois)
> 🎯  Psychology Coach → corrige tes biais sans que tu le demandes
>
> 👉  3 formules, en €, sans engagement caché :
>
>   • Pro · Mensuel — 29,99 €/mois
>     https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3
>   • Pro · Trimestriel — 83,99 €/3 mois (−7%)
>     https://app.suby.fi/p/pro_ue01q18pg2jrqwcf6y30w4kq
>   • Elite · Mensuel — 99,99 €/mois
>     https://app.suby.fi/p/pro_cbqaw8409drbd1o702c1amih
>   • Elite · Trimestriel — 279,99 €/3 mois (−7%)
>     https://app.suby.fi/p/pro_m0ocolwx3hcxch2pa66n5ygm
>
> On a un plan gratuit pour tester, et la version Pro démarre à
> 29,99 €/mois. Tu cliques, tu trades, tu vois.
>
> — L'équipe RxFx

### Social snippets

**X / Twitter** (anchor the Pro 29,99€ link):
```
https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3
```

**LinkedIn :**
> J'ai enfin un journal de trading qui se remplit tout seul (webhook
> RXFX), un radar qui me dit mon vrai profil de trader, et un coach
> qui corrige mes biais sans que je le demande.
>
> **RxFx Logbook** — Pro dès 29,99 €/mois →
> `https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3`

**Discord :**
```
**Nouveau dans la logbook :** Radar Analysis + Psychology Coach, en
automatique.

Pro : https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3   (29,99 €)
Elite : https://app.suby.fi/p/pro_cbqaw8409drbd1o702c1amih (99,99 €)
```

### Affiliate tracking

If your Suby plan supports query-string attribution, append an affiliate
identifier to each URL before sending (e.g.
`?ref=PARTNER01`). Confirm the feature is enabled in the Suby dashboard
before relying on it for conversion attribution.

### QR codes (printable)

The admin page exposes per-link **QR code** and **QR HD** (1024 px)
downloads via `api.qrserver.com`. The QR encodes the full Suby URL —
re-print if you ever rotate the link, since QR codes cannot be redirected.

### Syncing with the consumer app

If a URL ever rotates, update BOTH:

1. `rxfx-logbook-admin/src/pages/SubyCheckoutLinksPage.jsx` → `SUBY_CHECKOUT_LINKS`
2. `remix-of-trade-journal-pro/src/lib/suby.types.ts` → `SUBY_PAYMENT_LINKS`

The page-level comment in `SubyCheckoutLinksPage.jsx` calls this out.


## 6. Cross-app wiring (Suby webhook SSOT)

This app shares ONE Suby.fi merchant account with the consumer app (`remix-of-trade-journal-pro`). To prevent the same event from being activated twice when both webhook URLs are registered in Suby:

1. **In production**, set the env var `SUBY_OPERATIONAL_WEBHOOK_TARGET=consumer` so this app's webhook logs the event and acknowledges with 200 `{"skipped":"ssot_consumer"}` instead of writing to Firestore.
2. **In dev / staging**, leave it at the default `admin` (set automatically when the env var is absent).
3. **Diagnostic callable** `getSubyConnectionDiagnostics` (admin-PIN gated) returns masked last-4-char tails of `SUBY_API_KEY` + `SUBY_WEBHOOK_SECRET` plus `environment` + `operationalTarget` so you can audit-align with the consumer app's Vercel env dashboard to catch silent secret-mismatch drift.
4. **Read `/CONNECTION_MAP.md`** at the repo root for the full wiring spec — webhook SSOT, product-ID SSOT contract, dual-currency cents reconciliation, 30-day idempotency prune, periodic ops checklist, forbidden configurations.

## 7. New scheduled function: `purgeSubyProcessedEvents`

Runs every 24 hours UTC. Deletes `suby_processed_events` documents older than 30 days, batched (<=200 per page) so the Firestore quota stays safe even on multi-thousand backlogs. Mirrors the consumer app's inline 30-day TTL prune on the Supabase `webhook_idempotency` table.

## 8. `getSubyConnectionDiagnostics` callable

Returns `{ apiKeyMasked, apiKeyTail, webhookSecretMasked, webhookSecretTail, rotationOverlapActive, environment, operationalTarget, connection: { ok|error } }`. Compare `apiKeyTail` + `webhookSecretTail` against the consumer Vercel env dashboard to detect silent Suby-key-mismatch drift in seconds.
