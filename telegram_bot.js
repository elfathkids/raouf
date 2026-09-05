/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود بوت تيليغرام المستقل + المساعد الصوتي الذكي
 * المطور: Aminebens_off
 * المدير العام: raouf
 * 
 * 📌 الوظيفة: استقبال وتسجيل العمليات الصوتية والنصية وإرسال الإشعارات والتقارير
 * =========================================================================
 */

var BOT_TOKEN = "8520522099:AAFE0ONasErCxZsrd5hyMRSD5E-qx50gO4U";
var GEMINI_API_KEY = "AQ.Ab8RN6IdURWMkkoJz7ONupzHtZuowmqIHSSh9dXioMJx-Q0vhQ";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);

    if (payload.message) {
      handleTelegramMessage(payload.message);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }
    return ContentService.createTextOutput("No message").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// معالج رسائل التيليغرام الذكي (نصوص + فويس مع الذكاء الاصطناعي)
// =========================================================================
function handleTelegramMessage(message) {
  try {
    var chatId = message.chat ? message.chat.id : (message.from ? message.from.id : null);
    if (!chatId) return;

    // 🛑 منع التكرار (Anti-Spam / Deduplication)
    var msgId = message.message_id ? String(message.message_id) : null;
    if (msgId) {
      var cache = CacheService.getScriptCache();
      if (cache.get("MSG_" + msgId)) {
        return; // تم تنفيذ الرسالة سابقاً، تجاهل التكرار
      }
      cache.put("MSG_" + msgId, "1", 600);
    }

    var senderName = message.from ? (message.from.first_name || "المدير") : "المدير";
    var savedDataStr = PropertiesService.getScriptProperties().getProperty("LATEST_DATA");
    var data = savedDataStr ? JSON.parse(savedDataStr) : getDefaultDataStructure();

    // 🎙️ 1. تسجيل صوتي (Voice Note)
    if (message.voice || message.audio) {
      var voiceObj = message.voice || message.audio;
      sendTelegramMessageToChat(chatId, "⏳ <i>جاري الاستماع للرسالة الصوتية وتحليلها بالذكاء الاصطناعي...</i>");
      
      var parsedAi = processVoiceWithGemini(voiceObj.file_id);
      if (!parsedAi || !parsedAi.action || parsedAi.action === "unknown" || !parsedAi.amount) {
        sendTelegramMessageToChat(chatId, "⚠️ <b>تنبيه بخصوص الفويس:</b>\nلم نتمكن من تحليل الصوت تلقائياً. تأكد من إدخال مفتاح Gemini API صالح.\n\n💡 <i>يمكنك كتابة العملية كنص وسيسجلها البوت فوراً!</i>");
        return;
      }

      executeParsedTransaction(chatId, parsedAi, senderName, data, true);
      return;
    }

    // ✍️ 2. رسالة نصية أو أمر
    var rawText = (message.text || "").trim();
    var text = rawText.toLowerCase();

    if (text === "/start" || text === "/help" || text === "مساعدة" || text === "اوامر" || text === "أوامر") {
      var reply = "🏢 <b>مرحباً بك " + senderName + " في المساعد الذكي لمؤسسة الفتح!</b>\n" +
                  "━━━━━━━━━━━━━━━━━\n" +
                  "✍️ <b>اكتب العملية كما تتكلم بالدارجة وسيسجلها فوراً:</b>\n" +
                  "• <code>هزيت 500000 من باتنة</code> ⬅️ تسجيل تحصيل دينار\n" +
                  "• <code>هزيت 15 مليون من العلمة</code> ⬅️ تحصيل كاش\n" +
                  "• <code>خلصت سويف 3000 دولار</code> ⬅️ تسديد مصنع تركي\n" +
                  "• <code>فاتورة سيفيل 4500 دولار</code> ⬅️ فاتورة سلعة\n\n" +
                  "📊 <b>أوامر الكشوفات الفورية:</b>\n" +
                  "🏢 <b>/dettes</b> : كشف ديون ومستحقات المصانع\n" +
                  "🏬 <b>/mahlat</b> : وضعية المحلات والفروع\n" +
                  "💰 <b>/solde</b> : رصيد الخزينة وموقف السيولة\n" +
                  "💱 <b>/forex</b> : آخر عمليات الصرف والأورو\n\n" +
                  "👨‍💻 <i>مؤسسة الفتح - Aminebens_off</i>";
      sendTelegramMessageToChat(chatId, reply);
      return;
    }

    if (text.startsWith("/dette") || text.includes("ديون") || text.includes("الشركات") || text.includes("المصانع")) {
      replyDettesSummary(chatId, data);
      return;
    }

    if (text.startsWith("/mahlat") || text.startsWith("/branch") || text.includes("المحلات") || text.includes("الفروع")) {
      replyMahlatSummary(chatId, data);
      return;
    }

    if (text.startsWith("/solde") || text.includes("الخزينة") || text.includes("رصيد")) {
      replySoldeSummary(chatId, data);
      return;
    }

    if (text.startsWith("/forex") || text.includes("صرف") || text.includes("أورو") || text.includes("اورو")) {
      replyForexSummary(chatId, data);
      return;
    }

    // محاولة تحليل المعاملة بالدارجة
    var parsed = parseArabicTransactionText(rawText, data);
    if (parsed && parsed.action !== "unknown" && parsed.amount > 0) {
      executeParsedTransaction(chatId, parsed, senderName, data, false);
      return;
    }

  } catch (err) {
    console.error("Telegram handler error:", err);
  }
}

function sendTelegramMessageToChat(chatId, htmlText) {
  try {
    var url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML"
      }),
      muteHttpExceptions: true
    });
  } catch(e) {
    console.error("sendTelegramMessageToChat error:", e);
  }
}
