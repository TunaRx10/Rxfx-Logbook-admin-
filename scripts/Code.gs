/**
 * ═══════════════════════════════════════════════════════════════════════
 * RxFx Logbook — Google Apps Script (Web App) v2.0
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Déploiement :
 *   1. Copier ce script sur script.google.com → Nouveau projet
 *   2. Coller TOUT ce fichier dans Code.gs
 *   3. Déployer → Nouveau déploiement → Application Web
 *   4. Exécuter en tant que : "Moi" (ton compte Google)
 *   5. Accès : "Tout le monde" (Anyone)
 *   6. Copier l'URL générée → la mettre dans .env :
 *        VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/TON_ID/exec
 *
 * Actions supportées :
 *   - list_<section>     : lire toutes les lignes d'un onglet
 *   - upsert_<section>   : ajouter des lignes (append)
 *   - update_row         : modifier une ligne par rowIndex
 *   - delete_row         : supprimer une ligne par rowIndex
 *   - batch              : sync groupée multi-sections
 *   - send_email         : envoyer un email via Gmail
 *   - send_bulk_email    : envoi groupé
 *   - create_doc         : créer un Google Doc
 *   - ping               : health check
 *
 * Sections (onglets auto-créés) :
 *   signups, trades, payments, referrals, dashboard,
 *   support_tickets, mail_queue, calendar_events,
 *   payout_requests, logs, campaign_events, boutique_orders
 * ═══════════════════════════════════════════════════════════════════════
 */

/* ── Section Headers ─────────────────────────────────────────────── */

const SECTION_HEADERS = {
  signups: [
    "timestamp", "user_id", "email", "display_name", "first_name",
    "last_name", "birthday", "country", "referrer_code", "plan",
    "status", "created_at"
  ],
  trades: [
    "id", "timestamp", "user_id", "symbol", "direction",
    "entry_price", "exit_price", "pnl", "r_multiple", "closed_at",
    "emotion", "tags", "setup", "notes"
  ],
  payments: [
    "timestamp", "user_id", "email", "plan", "txn_id",
    "status", "provider", "amount", "currency"
  ],
  referrals: [
    "timestamp", "referrer_code", "referred_email", "referred_name",
    "country", "status", "payout_amount", "payout_status",
    "tier_reward", "tier_threshold", "tier_awarded_at",
    "type", "plan", "id"
  ],
  dashboard: [
    "timestamp", "user_id", "total_pnl", "win_rate", "total_trades",
    "avg_r", "best_trade", "worst_trade", "sharpe", "sortino",
    "profit_factor", "max_drawdown", "expectancy", "consistency",
    "plan", "subscription_status"
  ],
  support_tickets: [
    "id", "created_at", "updated_at", "user_email", "user_name",
    "subject", "status", "messages", "replies", "agent_typing"
  ],
  mail_queue: [
    "id", "createdAt", "to", "subject", "html",
    "status", "error", "userId"
  ],
  calendar_events: [
    "id", "title", "description", "start_date", "end_date",
    "location", "type", "status", "created_at"
  ],
  payout_requests: [
    "id", "created_at", "referrer_email", "referrer_id", "amount",
    "currency", "payout_address", "status", "active_count",
    "paid_at", "paid_amount", "approved_at", "approved_amount",
    "rejected_at", "rejected_reason"
  ],
  logs: [
    "timestamp", "type", "message", "status"
  ],
  campaign_events: [
    "id", "created_at", "name", "type", "status",
    "start_date", "end_date", "description", "data"
  ],
  boutique_orders: [
    "id", "user", "user_email", "product_name", "size",
    "color", "status", "total_price", "tracking_number", "created_at"
  ]
};

/* ── Sheet Helpers ────────────────────────────────────────────────── */

function getOrCreateSheet(section) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(section);
  if (!sheet) {
    sheet = ss.insertSheet(section);
    const headers = SECTION_HEADERS[section];
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#0a0f1a")
        .setFontColor("#06b6d4");
    }
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = { _rowIndex: i + 1 }; // 1-based row index for update_row/delete_row
    for (let j = 0; j < headers.length; j++) {
      obj[String(headers[j])] = data[i][j] != null ? data[i][j] : "";
    }
    rows.push(obj);
  }
  return rows;
}

/* ── Response Helpers ─────────────────────────────────────────────── */

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, status) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════════════════════════════════════════════════════════
   WEB APP — doPost (all actions via JSON POST)
   ═══════════════════════════════════════════════════════════════════ */

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return errorResponse("Invalid JSON: " + err.message);
  }

  const action = body.action || "";

  try {

    // ── list_<section> ─────────────────────────────────
    if (action.startsWith("list_")) {
      const section = action.replace("list_", "");
      const limit = parseInt(body.limit) || 500;
      if (!SECTION_HEADERS[section]) {
        return errorResponse("Section inconnue: " + section);
      }
      const sheet = getOrCreateSheet(section);
      let rows = sheetToObjects(sheet);
      if (limit < rows.length) rows = rows.slice(0, limit);
      return jsonResponse({ ok: true, rows: rows, count: rows.length, section: section });
    }

    // ── upsert_<section> ───────────────────────────────
    if (action.startsWith("upsert_")) {
      const section = action.replace("upsert_", "");
      if (!SECTION_HEADERS[section]) {
        return errorResponse("Section inconnue: " + section);
      }
      const rows = body.rows || [];
      if (rows.length === 0) {
        return jsonResponse({ ok: true, rows: 0, section: section, message: "No rows to upsert" });
      }
      const sheet = getOrCreateSheet(section);
      const headers = SECTION_HEADERS[section];
      let appended = 0;
      for (const row of rows) {
        const values = headers.map(function(h) {
          const val = row[h];
          if (val === undefined || val === null) return "";
          if (Array.isArray(val)) return JSON.stringify(val);
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        });
        sheet.appendRow(values);
        appended++;
      }
      // Keep last 5000 rows max
      if (sheet.getLastRow() > 5000) {
        const excess = sheet.getLastRow() - 5000;
        if (excess > 0) sheet.deleteRows(2, excess);
      }
      return jsonResponse({ ok: true, rows: appended, section: section });
    }

    // ── update_row ─────────────────────────────────────
    if (action === "update_row") {
      const section = body.section || "";
      const rowIndex = parseInt(body.rowIndex) || 0;
      const data = body.data || {};

      if (!section || !SECTION_HEADERS[section]) {
        return errorResponse("Section requise: " + section);
      }
      if (rowIndex < 2) {
        return errorResponse("rowIndex invalide (doit être >= 2, la ligne 1 = headers)");
      }

      const sheet = getOrCreateSheet(section);
      const headers = SECTION_HEADERS[section];

      for (const key of Object.keys(data)) {
        const col = headers.indexOf(key);
        if (col >= 0) {
          let val = data[key];
          if (Array.isArray(val)) val = JSON.stringify(val);
          if (typeof val === "object" && val !== null) val = JSON.stringify(val);
          sheet.getRange(rowIndex, col + 1).setValue(val != null ? val : "");
        }
      }
      return jsonResponse({ ok: true, section: section, rowIndex: rowIndex });
    }

    // ── delete_row ─────────────────────────────────────
    if (action === "delete_row") {
      const section = body.section || "";
      const rowIndex = parseInt(body.rowIndex) || 0;

      if (!section || !SECTION_HEADERS[section]) {
        return errorResponse("Section requise: " + section);
      }
      if (rowIndex < 2) {
        return errorResponse("rowIndex invalide (doit être >= 2)");
      }

      const sheet = getOrCreateSheet(section);
      sheet.deleteRow(rowIndex);
      return jsonResponse({ ok: true, section: section, rowIndex: rowIndex });
    }

    // ── batch ──────────────────────────────────────────
    if (action === "batch") {
      const sections = body.sections || {};
      let totalRows = 0;
      for (const section of Object.keys(sections)) {
        if (!SECTION_HEADERS[section]) continue;
        const rows = sections[section] || [];
        if (rows.length === 0) continue;
        const sheet = getOrCreateSheet(section);
        const headers = SECTION_HEADERS[section];
        for (const row of rows) {
          const values = headers.map(function(h) {
            const val = row[h];
            if (val === undefined || val === null) return "";
            if (Array.isArray(val)) return JSON.stringify(val);
            if (typeof val === "object") return JSON.stringify(val);
            return val;
          });
          sheet.appendRow(values);
          totalRows++;
        }
      }
      return jsonResponse({ ok: true, totalRows: totalRows });
    }

    // ── send_email ─────────────────────────────────────
    // Accepte à la fois "body" (google-api.js) et "html" (historique)
    if (action === "send_email") {
      const to = body.to || "";
      const subject = body.subject || "";
      const htmlBody = body.body || body.html || "";  // ← compatible avec les 2 formats

      if (!to || !subject) {
        return errorResponse("to et subject sont requis");
      }

      try {
        GmailApp.sendEmail(to, subject, "", {
          htmlBody: String(htmlBody),
          name: "RxFx Logbook"
        });
        return jsonResponse({ ok: true, to: to, subject: subject });
      } catch (err) {
        return errorResponse("Gmail error: " + err.message);
      }
    }

    // ── send_bulk_email ────────────────────────────────
    if (action === "send_bulk_email") {
      const recipients = body.recipients || [];
      if (recipients.length === 0) {
        return errorResponse("recipients array vide");
      }

      let sent = 0;
      let failed = 0;
      const errors = [];

      for (const r of recipients) {
        try {
          GmailApp.sendEmail(r.to, r.subject, "", {
            htmlBody: String(r.body || r.html || ""),
            name: "RxFx Logbook"
          });
          sent++;
        } catch (err) {
          failed++;
          errors.push({ to: r.to, error: err.message });
        }
      }

      return jsonResponse({ ok: true, sent: sent, failed: failed, errors: errors });
    }

    // ── create_doc ─────────────────────────────────────
    if (action === "create_doc") {
      const title = body.title || "Rapport RxFx";
      const content = body.content || "";

      try {
        const doc = DocumentApp.create(title);
        const bodyElement = doc.getBody();
        bodyElement.setText(String(content));
        doc.saveAndClose();

        return jsonResponse({
          ok: true,
          docUrl: doc.getUrl(),
          docId: doc.getId(),
          title: title
        });
      } catch (err) {
        return errorResponse("Doc creation error: " + err.message);
      }
    }

    // ── get_calendar_events ───────────────────────────
    if (action === "get_calendar_events") {
      const days = parseInt(body.days) || 30;
      try {
        const cal = CalendarApp.getDefaultCalendar();
        const now = new Date();
        const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const events = cal.getEvents(now, end);
        const result = events.map(function(ev) {
          return {
            id: ev.getId(),
            title: ev.getTitle(),
            description: ev.getDescription() || "",
            start: ev.getStartTime().toISOString(),
            end: ev.getEndTime().toISOString(),
            location: ev.getLocation() || "",
            allDay: ev.isAllDayEvent(),
            color: ev.getColor() || "",
          };
        });
        return jsonResponse({ ok: true, events: result, count: result.length });
      } catch (err) {
        return errorResponse("Calendar error: " + err.message);
      }
    }

    // ── create_calendar_event ──────────────────────────
    if (action === "create_calendar_event") {
      const title = body.title || "";
      const startDate = body.start_date ? new Date(body.start_date) : new Date();
      const endDate = body.end_date ? new Date(body.end_date) : new Date(startDate.getTime() + 3600000);
      const description = body.description || "";
      const location = body.location || "";

      if (!title) return errorResponse("title requis");

      try {
        const cal = CalendarApp.getDefaultCalendar();
        const ev = cal.createEvent(title, startDate, endDate, {
          description: description,
          location: location,
        });
        return jsonResponse({
          ok: true,
          eventId: ev.getId(),
          title: title,
          eventUrl: "https://calendar.google.com/calendar/r/eventedit/" + encodeURIComponent(ev.getId()),
        });
      } catch (err) {
        return errorResponse("Calendar create error: " + err.message);
      }
    }

    // ── delete_calendar_event ──────────────────────────
    if (action === "delete_calendar_event") {
      const eventId = body.event_id || "";
      if (!eventId) return errorResponse("event_id requis");
      try {
        const cal = CalendarApp.getDefaultCalendar();
        const ev = cal.getEventById(eventId);
        if (!ev) return errorResponse("Événement introuvable");
        ev.deleteEvent();
        return jsonResponse({ ok: true, eventId: eventId });
      } catch (err) {
        return errorResponse("Calendar delete error: " + err.message);
      }
    }

    // ── create_certificate ─────────────────────────────
    if (action === "create_certificate") {
      const userName = body.user_name || "Trader";
      const plan = body.plan || "Pro";
      const date = body.date || new Date().toISOString().split("T")[0];
      const traderLevel = body.trader_level || "";
      const stats = body.stats || {};

      try {
        const doc = DocumentApp.create("Certificat RxFx — " + userName);
        const docBody = doc.getBody();

        // Style the document
        docBody.setMarginTop(40).setMarginBottom(40).setMarginLeft(60).setMarginRight(60);

        // Header
        const header = docBody.appendParagraph("RxFx LOGBOOK");
        header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
        header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        header.setFontFamily("Montserrat");
        header.setFontSize(28);
        header.setForegroundColor("#06b6d4");
        header.setBold(true);

        docBody.appendParagraph("CERTIFICAT DE TRADING")
          .setHeading(DocumentApp.ParagraphHeading.HEADING2)
          .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
          .setFontSize(18)
          .setForegroundColor("#94a3b8");

        docBody.appendParagraph(""); // spacer

        // Body
        const awarded = docBody.appendParagraph(
          "Décerné à " + userName + "\n\n" +
          "En reconnaissance de son engagement et de ses performances\n" +
          "sur la plateforme RxFx Logbook.\n\n" +
          "Plan : " + plan.toUpperCase() + "\n" +
          (traderLevel ? "Niveau : " + traderLevel + "\n" : "") +
          "Date : " + date + "\n\n"
        );
        awarded.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        awarded.setFontSize(14);
        awarded.setFontFamily("Inter");
        awarded.setForegroundColor("#e2e8f0");

        // Stats
        if (stats.totalTrades) {
          const statsPara = docBody.appendParagraph(
            "Statistiques\n" +
            "• Trades : " + (stats.totalTrades || 0) + "\n" +
            "• Win Rate : " + (stats.winRate || 0) + "%\n" +
            "• P&L : $" + (stats.totalPnl || 0).toFixed(2) + "\n" +
            "• R:R Moyen : " + (stats.avgR || 0).toFixed(2) + "R"
          );
          statsPara.setFontSize(12);
          statsPara.setForegroundColor("#64748b");
        }

        docBody.appendParagraph("");
        docBody.appendParagraph("RxFx Logbook — Built for the elite.")
          .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
          .setFontSize(10)
          .setForegroundColor("#475569")
          .setItalic(true);

        doc.saveAndClose();

        return jsonResponse({
          ok: true,
          docUrl: doc.getUrl(),
          docId: doc.getId(),
          type: "certificate",
        });
      } catch (err) {
        return errorResponse("Certificate creation error: " + err.message);
      }
    }

    // ── ping ───────────────────────────────────────────
    if (action === "ping") {
      return jsonResponse({
        ok: true,
        message: "RxFx Apps Script v2.0 — operational",
        sections: Object.keys(SECTION_HEADERS),
        timestamp: new Date().toISOString()
      });
    }

    // ── Unknown action ─────────────────────────────────
    return errorResponse("Action inconnue: " + action);

  } catch (err) {
    return errorResponse("Server error: " + err.message);
  }
}

/* ── GET — Health check ────────────────────────────────────────────── */

function doGet(e) {
  return jsonResponse({
    ok: true,
    message: "RxFx Apps Script v2.0 — POST JSON to interact",
    actions: [
      "list_<section>", "upsert_<section>",
      "update_row", "delete_row", "batch",
      "send_email", "send_bulk_email", "create_doc", "create_certificate",
      "get_calendar_events", "create_calendar_event", "delete_calendar_event",
      "ping"
    ],
    sections: Object.keys(SECTION_HEADERS),
    timestamp: new Date().toISOString()
  });
}
