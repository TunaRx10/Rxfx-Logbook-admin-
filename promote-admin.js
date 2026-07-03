import admin from 'firebase-admin';
import { readFileSync } from 'fs';

/**
 * PROTOCOLE D'ÉLÉVATION ADMIN - RXFX LOGBOOK
 * 
 * Instructions:
 * 1. Placez votre 'service-account.json' à la racine du projet.
 * 2. Remplacez le UID ci-dessous par votre UID Firebase (trouvable dans la console Auth).
 * 3. Exécutez: node promote-admin.js
 */

const serviceAccount = JSON.parse(
  readFileSync(new URL('./service-account.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const TARGET_UID = 'VOTRE_UID_ICI'; // <-- REMPLACEZ PAR VOTRE UID

async function grantAdmin(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`\n[SUCCESS] Autorisation Root accordée au Node : ${uid}`);
    console.log(`[INFO] L'utilisateur doit se déconnecter et se reconnecter pour activer les droits.\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n[ERROR] Échec de l'élévation : ${error.message}\n`);
    process.exit(1);
  }
}

grantAdmin(TARGET_UID);
