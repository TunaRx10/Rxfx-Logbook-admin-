const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setCustomUserClaims } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sgMail = require("@sendgrid/mail");
const { google } = require("googleapis");
const { DateTime } = require("luxon");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();

// Configuration APIs (Utilisation des variables d'environnement Firebase)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;

/**
 * AUTOMATED BIRTHDAY SYSTEM
 * Déclenché chaque heure pour couvrir tous les fuseaux horaires à 09:00 AM.
 */
exports.automatedBirthdaySystem = onSchedule("0 * * * *", async (event) => {
  const nowUtc = DateTime.utc();
  const currentYear = nowUtc.year;

  try {
    const usersSnap = await db.collection("users")
      .where("active", "==", true)
      .get();

    for (const doc of usersSnap.docs) {
      const user = doc.data();
      if (!user.timezone || !user.birthDate) continue;

      const userLocalTime = DateTime.now().setZone(user.timezone);

      // Vérifier s'il est 09:00 AM dans la timezone de l'utilisateur
      if (userLocalTime.hour === 9) {
        const [bYear, bMonth, bDay] = user.birthDate.split("-").map(Number);

        // Vérifier si c'est son anniversaire aujourd'hui
        if (userLocalTime.month === bMonth && userLocalTime.day === bDay && user.lastBirthdayProcessed !== currentYear) {
          await processBirthday(doc.id, user, currentYear, userLocalTime);
        }
      }
    }
  } catch (error) {
    console.error("Critical failure in birthday system:", error);
  }
});

async function processBirthday(userId, user, year, localTime) {
  try {
    // 1. Génération IA avec Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Génère un email d'anniversaire chaleureux et professionnel pour ${user.name} (Plateforme RxFx Logbook). Retourne uniquement le code HTML.`;
    const result = await model.generateContent(prompt);
    const htmlContent = result.response.text();

    // 2. Queue Email (Pour votre propre système d'envoi)
    // Vous pouvez brancher ici Nodemailer ou l'extension "Trigger Email"
    await db.collection("mail_queue").add({
      to: user.email,
      message: {
        subject: `🎂 Joyeux Anniversaire ${user.name} !`,
        html: htmlContent,
      },
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      userId: userId
    });

    // 3. Google Calendar Integration
    const calendarId = await createCalendarEvent(user, htmlContent, localTime);

    // 4. Update & Log
    await db.collection("users").doc(userId).update({ lastBirthdayProcessed: year });
    await db.collection("birthday_logs").add({
      userId,
      timestamp: FieldValue.serverTimestamp(),
      status: "QUEUED",
      calendarEventId: calendarId,
      year
    });

  } catch (error) {
    console.error(`Failed to process birthday for ${user.email}:`, error);
  }
}

async function createCalendarEvent(user, description, localDate) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "./service-account.json",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    
    const event = {
      summary: `🎂 Birthday - ${user.name}`,
      description: description.replace(/<[^>]*>?/gm, ""),
      start: { dateTime: localDate.set({ hour: 9, minute: 0 }).toISO(), timeZone: user.timezone },
      end: { dateTime: localDate.set({ hour: 10, minute: 0 }).toISO(), timeZone: user.timezone },
    };

    const res = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    return res.data.id;
  } catch (e) {
    console.error("Calendar integration error:", e);
    return null;
  }
}

/**
 * ELEVATION PROTOCOL: makeAdmin
 * Permet à un admin existant de promouvoir un autre utilisateur.
 */
exports.makeAdmin = onCall(async (request) => {
  // 1. Vérification de l'autorité de l'appelant
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError(
      "permission-denied",
      "Seul un Administrateur Principal peut émettre cette directive."
    );
  }

  const { uid, email } = request.data;

  try {
    // 2. Attribution des Custom Claims dans Firebase Auth
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    // 3. Journalisation dans le RXFX Audit Log (Firestore)
    await db.collection("audit_logs").add({
      action: "ADMIN_PROMOTION",
      target_uid: uid,
      target_email: email,
      granted_by: request.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "SUCCESS"
    });

    return { message: `Node ${email} élevé au rang d'Administrateur.` };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * REAL-TIME SYSTEM STATS
 */
exports.getSystemStats = onCall(async (request) => {
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Unauthorized access.");
  }

  try {
    const usersSnap = await db.collection("users").count().get();
    const logsSnap = await db.collection("audit_logs").count().get();
    
    return {
      totalUsers: usersSnap.data().count,
      totalLogs: logsSnap.data().count,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
