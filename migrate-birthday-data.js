/**
 * RXFX LOGBOOK - DATA MIGRATION SCRIPT
 * Task: Standardize birthDate format and inject IANA Timezones
 * Run: node migrate-birthday-data.js
 */

const admin = require("firebase-admin");
const { DateTime } = require("luxon");

// IMPORTANT: Ensure you have initialized firebase-admin or have service-account.json
// If running in local environment with gcloud auth, this will use default credentials
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateUsers() {
  console.log("[MIGRATION] Starting user data standardization...");
  
  const usersRef = db.collection("users");
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log("No users found to migrate.");
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};

    // 1. Force IANA Timezone if missing
    if (!data.timezone) {
      updates.timezone = "America/Port-au-Prince"; 
    }

    // 2. Standardize birthDate (Try to parse various formats to YYYY-MM-DD)
    if (data.birthDate) {
      try {
        let dateObj;
        if (data.birthDate.toDate) {
          // It's a Firestore Timestamp
          dateObj = DateTime.fromJSDate(data.birthDate.toDate());
        } else if (typeof data.birthDate === 'string') {
          // Try common formats
          dateObj = DateTime.fromFormat(data.birthDate, "yyyy-MM-dd");
          if (!dateObj.isValid) dateObj = DateTime.fromFormat(data.birthDate, "dd/MM/yyyy");
          if (!dateObj.isValid) dateObj = DateTime.fromISO(data.birthDate);
        }

        if (dateObj && dateObj.isValid) {
          updates.birthDate = dateObj.toFormat("yyyy-MM-dd");
        }
      } catch (e) {
        console.warn(`Could not parse birthDate for user ${doc.id}:`, data.birthDate);
      }
    }

    // 3. Initialize processing fields
    if (data.lastBirthdayProcessed === undefined) {
      updates.lastBirthdayProcessed = 0;
    }

    // 4. Ensure active status
    if (data.active === undefined) {
      updates.active = true;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`[SUCCESS] Migration complete. ${count} users updated.`);
  } else {
    console.log("[INFO] All users are already up to date.");
  }
}

migrateUsers().catch(console.error);
