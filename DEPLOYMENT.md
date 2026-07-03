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
