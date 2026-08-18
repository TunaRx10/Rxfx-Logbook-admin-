# Deployment Guide — RxFx Logbook Administrator

Guide de déploiement du dashboard admin, basé sur la stack actuelle :

- **Frontend** : SPA React + Vite, déployée sur **Vercel** (`vercel.json`, build `npm run build` → `dist/`).
- **Backend (données + auth + emails)** : **Google Sheets** via un **Apps Script** Web App
  (`google-sheets-db/Code.gs`) — protocole `POST { action, payload }`.
- **IA** : fonctions serverless `api/admin-ai/*` (OpenRouter / Gemini), clés côté serveur.
- **Android** : Capacitor (`android/`, `build-apk.sh`).

Il n'y a **plus de Firebase ni de Supabase** : ne pas suivre d'anciens guides Firebase.

---

## 1. Prérequis

- Node.js 18+
- Un compte Google (pour le spreadsheet + Apps Script)
- Accès à Vercel pour le projet `rxfx-logbook-admin`

---

## 2. Backend — Apps Script + Google Sheets

### 2.1 Créer le spreadsheet

1. Créer un Google Sheet vierge (il servira de base de données).
2. Copier son ID (dans l'URL : `docs.google.com/spreadsheets/d/<ID>/edit`) — il servira
   pour la propriété `SPREADSHEET_ID`.

### 2.2 Créer le script

1. Aller sur https://script.google.com → **Nouveau projet**.
2. **Coller l'intégralité** du contenu de `google-sheets-db/Code.gs` dans `Code.gs`.
3. Enregistrer (Ctrl+S).

### 2.3 Propriétés de script

⚙️ **Paramètres du projet → Propriétés de script** → **Ajouter une propriété** :

| Clé | Valeur |
|---|---|
| `SPREADSHEET_ID` | ID du spreadsheet (voir 2.1) |
| `API_KEY` | clé secrète longue (ex. `openssl rand -hex 32`) — utilisée **serveur/cron uniquement** (jamais côté client) |
| `JWT_SECRET` | secret JWT — **auto-généré** à la 1ʳᵉ requête (ne pas définir `change-me`) |
| `APP_URL` | URL du frontend (pour les liens dans les emails) |

> Les **actions admin** s'authentifient désormais via le token de session d'un compte
> `role: admin` (JWT). `API_KEY` reste disponible pour les intégrations serveur (cron, webhooks).

### 2.4 Initialiser les feuilles

1. Dans l'éditeur Apps Script, exécuter `setup()` (crée les ~49 feuilles + seed des
   templates d'emails).
2. Exécuter `setupTriggers()` (déclencheurs : expirations, anniversaires, file d'emails,
   synchronisation calendrier).

### 2.5 Déployer en Web App

1. **Déployer → Nouveau déploiement → Web app** :
   - **Execute as** : `Me`
   - **Who has access** : **`Anyone`** ⬅️ (pas « Anyone with Google account »)
2. Copier l'URL `/exec` → c'est `VITE_GOOGLE_APPS_SCRIPT_URL`.

> ⚠️ Chaque re-déploiement peut **changer l'ID de l'URL**. Si l'URL change, mettre à jour
> la variable d'environnement côté Vercel et relancer le déploiement.

### 2.6 Tester le backend

Ouvrir dans un navigateur :
```
https://script.google.com/macros/s/<ID>/exec?action=health
```
Un JSON `{"ok":true,...}` = déploiement valide. Une page Google = accès pas en « Anyone ».

---

## 3. Variables d'environnement

### Vercel (production) — project settings → Environment Variables

| Variable | Obligatoire | Description |
|---|---|---|
| `VITE_GOOGLE_APPS_SCRIPT_URL` | ✅ | URL `/exec` du déploiement (voir 2.5) — lue côté client |
| `GOOGLE_APPS_SCRIPT_URL` | ✅ | Même URL — lue côté serveur (proxy `/api/admin-ai` pour vérifier la session admin) |
| `OPENROUTER_API_KEY` | ❌ | IA (chat) — optionnel |
| `GEMINI_API_KEY` | ❌ | IA (génération d'images) — optionnel |

> `VITE_*` sont **figées au build** : après modification, **re-déployer** sur Vercel.

### Local (`.env`)

Copier `.env.example` → `.env` et renseigner au minimum :
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
```

---

## 4. Développement local

```bash
cd rxfx-logbook-admin
npm install
npm run dev        # http://localhost:5173
```

---

## 5. Déploiement Vercel

```bash
cd rxfx-logbook-admin
vercel --prod
```
Ou via le dashboard Vercel (import du repo, framework **Vite**, build `npm run build`,
output `dist`). Le `vercel.json` gère le rewrite SPA (`/*` → `index.html`, sauf `/api/*`).

---

## 6. Premier compte admin

1. Ouvrir l'app → `/login` → onglet **Inscription**.
2. Renseigner : email, prénom, nom, date de naissance, pays, **mot de passe ≥ 12 caractères**
   (majuscule + minuscule + chiffre + caractère spécial).
3. Mettre `role=admin` manuellement dans la colonne `role` de la feuille `profiles`
   (bootstrap du premier admin), puis se reconnecter.
4. À la connexion, le **PIN gate** (`verifyAdminPin`) vérifie le PIN admin via la session admin.

---

## 7. Android (Capacitor)

```bash
npm run cap:sync     # synchronise le build web vers android/
bash build-apk.sh    # construit l'APK
```

---

## 8. Dépannage

| Symptôme | Cause probable | Correctif |
|---|---|---|
| `HTTP 401 / Non autorisé` | session absente/expirée | Se reconnecter (le token de session est requis) |
| `HTTP 403 / Accès refusé` | rôle insuffisant | Vérifier `role=admin` dans la feuille `profiles` |
| Réponse HTML au lieu de JSON | déploiement expiré ou accès pas « Anyone » | Re-déployer (2.5) + mettre à jour l'URL |
| `register`/`login` → 401 | Code.gs déployé non à jour | Recopier `google-sheets-db/Code.gs` (corrigé) et re-déployer |
| Le dashboard ne charge pas | URL `VITE_GOOGLE_APPS_SCRIPT_URL` obsolète après re-déploiement | Mettre à jour la variable et re-déployer Vercel |
