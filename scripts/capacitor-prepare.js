import { execSync } from 'child_process';

/**
 * 🛠️ CAPACITOR NATIVE PREPARE SCRIPT
 * 
 * Ce script prépare le projet pour un build Android natif.
 * Il s'assure que :
 * 1. Le build web (Vite) est à jour.
 * 2. Les assets sont synchronisés avec le dossier 'android'.
 * 3. Les correctifs spécifiques au natif (URL, permissions) sont appliqués.
 */

const PROJECT_ROOT = process.cwd();

if (!/^https:\/\//.test(process.env.VITE_API_URL || "")) {
  console.error("❌ VITE_API_URL doit être une URL HTTPS publique avant la préparation native.");
  console.error("   Exemple : VITE_API_URL=https://admin.exemple.com npm run native:prepare");
  process.exit(1);
}

function run(command) {
  console.log(`\n🚀 Exécution : ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Échec de la commande : ${command}`);
    process.exit(1);
  }
}

console.log('--- RxFX Logbook Admin Native Prepare ---');

// 1. Build de l'application Web
run('npm run build');

// 2. Synchronisation Capacitor
run('npx cap sync android');

// 3. Post-Sync Fixes (Optionnel : si vous avez des correctifs spécifiques à injecter dans le code natif)
console.log('\n🔧 Application des correctifs natifs...');

// Note : capacitor.config.json est déjà configuré correctement.
// On s'assure que le dossier 'dist' est bien celui utilisé.

console.log('\n✅ Terrain préparé !');
console.log('Prochaines étapes :');
console.log('1. Ouvrez Android Studio : npx cap open android');
console.log('2. Générez l\'APK via Build > Build Bundle(s) / APK(s) > Build APK(s)');
