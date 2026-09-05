/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود المزامنة مع Google Sheets + المساعد الذكي لتليغرام
 * المطور: Aminebens_off
 * المدير العام: raouf
 * رابط تطبيق الويب: https://script.google.com/macros/s/AKfycbzGcnan0f-p1YmyMXmLmbPOE-Zs0CBMtV9xpTKjBY9B08gRUYbaUdAI-jdN-SAis7dL8w/exec
 * =========================================================================
 */

// 🔑 مفاتيح الربط
var BOT_TOKEN = "8520522099:AAFE0ONasErCxZsrd5hyMRSD5E-qx50gO4U"; 
var GEMINI_API_KEY = "AQ.Ab8RN6IdURWMkkoJz7ONupzHtZuowmqIHSSh9dXioMJx-Q0vhQ";
var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzGcnan0f-p1YmyMXmLmbPOE-Zs0CBMtV9xpTKjBY9B08gRUYbaUdAI-jdN-SAis7dL8w/exec";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);

    // =====================================================================
    // الحالة 1: رسالة واردة من بوت تيليغرام (نص أو فويس أو أمر)
    // =====================================================================
    if (payload.message) {
      handleTelegramMessage(payload.message);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    // =====================================================================
    // الحالة 2: مزامنة قادمة من تطبيق الويب (El Feth Web App)
    // =====================================================================
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var syncTimestamp = Utilities.formatDate(new Date(), "Africa/Algiers", "yyyy-MM-dd HH:mm:ss");

    PropertiesService.getScriptProperties().setProperty("LATEST_DATA", contents);

    var sheetDashboard = getOrCreateSheet(ss, "📊 لوحة الخزينة والأرصدة", 1);
    buildDashboardSheet(sheetDashboard, payload, syncTimestamp);

    var sheetCollections = getOrCreateSheet(ss, "💵 تحصيلات الدينار DZD", 2);
    buildCollectionsSheet(sheetCollections, payload.dzdCollections, payload.branches);

    var sheetForex = getOrCreateSheet(ss, "💱 صرف العملات Forex", 3);
    buildForexSheet(sheetForex, payload.forexTransfers, payload.branches, payload.brokers);

    var sheetInvoices = getOrCreateSheet(ss, "📦 فواتير المصانع USD", 4);
    buildInvoicesSheet(sheetInvoices, payload.supplierInvoices, payload.suppliers, payload.branches);

    var sheetPayments = getOrCreateSheet(ss, "💳 تسديدات المصانع Payments", 5);
    buildPaymentsSheet(sheetPayments, payload.supplierPayments, payload.suppliers, payload.branches);

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "تم تحديث كافة جداول Google Sheets بنجاح!",
      timestamp: syncTimestamp
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
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

    var isGroup = message.chat && (message.chat.type === "group" || message.chat.type === "supergroup");

    // 🛑 منع التكرار (Anti-Spam / Deduplication)
    var msgId = message.message_id ? String(message.message_id) : null;
    if (msgId) {
      var cache = CacheService.getScriptCache();
      if (cache.get("MSG_" + msgId)) {
        return; // تم تنفيذ هذه الرسالة سابقاً، تجاهل التكرار فوراً!
      }
      cache.put("MSG_" + msgId, "1", 600);
    }

    var senderName = message.from ? (message.from.first_name || "المدير") : "المدير";
    var savedDataStr = PropertiesService.getScriptProperties().getProperty("LATEST_DATA");
    var data = savedDataStr ? JSON.parse(savedDataStr) : getDefaultDataStructure();

    // -----------------------------------------------------------------------
    // 🎙️ 1. إذا كانت الرسالة عبارة عن تسجيل صوتي (Voice Note)
    // -----------------------------------------------------------------------
    if (message.voice || message.audio) {
      var voiceObj = message.voice || message.audio;
      sendTelegramMessageToChat(chatId, "⏳ <i>جاري الاستماع للرسالة الصوتية وتحليلها بالذكاء الاصطناعي...</i>");
      
      var parsedAi = processVoiceWithGemini(voiceObj.file_id);
      if (!parsedAi || !parsedAi.action || parsedAi.action === "unknown" || !parsedAi.amount) {
        sendTelegramMessageToChat(chatId, "⚠️ <b>تنبيه بخصوص الفويس:</b>\nلم نتمكن من تحليل الصوت تلقائياً. تأكد من إدخال مفتاح Gemini API صالح (يبدأ بـ <code>AIzaSy</code>) في السكربت.\n\n💡 <i>يمكنك الآن كتابة العملية كنص وسيسجلها البوت فوراً!</i>");
        return;
      }

      executeParsedTransaction(chatId, parsedAi, senderName, data, true);
      return;
    }

    // -----------------------------------------------------------------------
    // ✍️ 2. إذا كانت الرسالة نصية عادية
    // -----------------------------------------------------------------------
    var rawText = (message.text || "").trim();
    var text = rawText.toLowerCase();

    // أوامر التقارير الفورية
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

    if (text.startsWith("/forex") || text.includes("الصرف") || text.includes("الاورو") || text.includes("الأورو")) {
      replyForexSummary(chatId, data);
      return;
    }

    // التحليل الذكي للعمليات المالية:
    var extractedAmount = extractNumber(text);
    var branchMatch = detectBranch(text);
    var supplierMatch = detectSupplier(text, data.suppliers);

    // أ) تحصيل دينار من فرع أو كاش
    var isCollection = text.includes("هزيت") || text.includes("قبضت") || text.includes("ديت") || 
                       text.includes("استلمت") || text.includes("تحصيل") || text.includes("كاش") ||
                       text.includes("دخلت") || text.includes("مقبوض") || text.includes("جبت");

    if (isCollection && extractedAmount > 0) {
      var br = branchMatch || { id: "batna", name: "باتنة (الفرع الرئيسي)" };
      executeParsedTransaction(chatId, {
        action: "collection",
        branch: br.id,
        branchName: br.name,
        amount: extractedAmount,
        notes: rawText
      }, senderName, data, false);
      return;
    }

    // ب) تسديد مصنع أو شركة (دعم الأورو والدولار)
    var isPayment = text.includes("خلصت") || text.includes("دفعت") || text.includes("تسديد") || 
                    text.includes("سددت") || text.includes("فرست") || text.includes("فيريت") ||
                    text.includes("عطيت") || text.includes("مديت");

    var isEur = text.includes("اورو") || text.includes("أورو") || text.includes("يورو") || text.includes("eur") || text.includes("€");

    if (isPayment && extractedAmount > 0) {
      var sup = supplierMatch || { id: "s_soydan", name: "Soydan (المصنع)" };
      executeParsedTransaction(chatId, {
        action: "payment",
        supplierId: sup.id,
        supplierName: sup.name,
        amount: extractedAmount,
        currency: isEur ? "EUR" : "USD",
        notes: rawText
      }, senderName, data, false);
      return;
    }

    // ج) فاتورة أو سلعة جديدة
    var isInvoice = text.includes("فاتورة") || text.includes("سلعة") || text.includes("شحنة") || text.includes("كولي");
    if (isInvoice && extractedAmount > 0) {
      var invSup = supplierMatch || { id: "s_soydan", name: "Soydan (المصنع)" };
      executeParsedTransaction(chatId, {
        action: "invoice",
        supplierId: invSup.id,
        supplierName: invSup.name,
        amount: extractedAmount,
        notes: rawText
      }, senderName, data, false);
      return;
    }

    // إذا تم ذكر رقم ومحل مباشرة (مثال: "باتنة 500000" أو "العلمة 200000")
    if (branchMatch && extractedAmount > 0) {
      executeParsedTransaction(chatId, {
        action: "collection",
        branch: branchMatch.id,
        branchName: branchMatch.name,
        amount: extractedAmount,
        notes: rawText
      }, senderName, data, false);
      return;
    }

    // إذا تم ذكر رقم ومصنع مباشرة (مثال: "سويف 2000 دولار")
    if (supplierMatch && extractedAmount > 0) {
      executeParsedTransaction(chatId, {
        action: "payment",
        supplierId: supplierMatch.id,
        supplierName: supplierMatch.name,
        amount: extractedAmount,
        notes: rawText
      }, senderName, data, false);
      return;
    }

    // في المجموعات: لا ترسل أي رد إذا كانت الرسالة مجرد دردشة عادية
    if (isGroup) {
      return;
    }

    // في المحادثة الخاصة فقط: رد توجيهي إذا كانت الرسالة موجهة للبوت
    if (text.length > 2) {
      var defaultReply = "👋 أهلاً بك " + senderName + "!\n" +
                         "💡 <b>لتسجيل عملية اكتب مثلاً:</b>\n" +
                         "• <code>هزيت 500000 من باتنة</code>\n" +
                         "• <code>خلصت سويف 2500 دولار</code>\n" +
                         "• <code>فاتورة سيفيل 4000 دولار</code>\n\n" +
                         "📊 أو أرسل <b>/help</b> لعرض الكشوفات.";
      sendTelegramMessageToChat(chatId, defaultReply);
    }

  } catch(err) {
    Logger.log("Telegram Handler Exception: " + err);
  }
}

// =========================================================================
// دالة معالجة الرسائل الصوتية عبر Gemini AI
// =========================================================================
function processVoiceWithGemini(fileId) {
  try {
    var token = BOT_TOKEN || PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
    var fileRes = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + fileId);
    var filePath = JSON.parse(fileRes.getContentText()).result.file_path;

    var audioBlob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + token + "/" + filePath).getBlob();
    var base64Audio = Utilities.base64Encode(audioBlob.getBytes());

    var geminiKey = GEMINI_API_KEY || PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!geminiKey || geminiKey === "") return null;

    var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + geminiKey;

    var promptText = "أنت مساعد محاسبي لمؤسسة الفتح لاستيراد ملابس الأطفال بالجزائر. استمع لهذا التسجيل الصوتي بالدارجة الجزائرية واستخرج تفاصيل العملية. " +
                     "المحلات المتاحة: batna (باتنة), blida (البليدة), oran (وهران), ogx (أو جي إكس / العلمة). " +
                     "المصانع التركية: soydan, civil, mutlu, clementine, elsima, dalex, damasquino, cikoby, pengim, kocak, bbs, exina. " +
                     "أجب بصيغة JSON فقط: " +
                     "{\"action\": \"collection|payment|invoice|forex|unknown\", \"branch\": \"batna|blida|oran|ogx\", \"supplier\": \"اسم المصنع باللاتينية\", \"amount\": 500000, \"transcription\": \"نص ما قيل بالصوت\"}";

    var requestBody = {
      contents: [{
        parts: [
          { inline_data: { mime_type: "audio/ogg", data: base64Audio } },
          { text: promptText }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    var response = UrlFetchApp.fetch(apiUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    var resJson = JSON.parse(response.getContentText());
    if (resJson.candidates && resJson.candidates.length > 0) {
      var jsonText = resJson.candidates[0].content.parts[0].text;
      return JSON.parse(jsonText);
    }
    return null;
  } catch (err) {
    Logger.log("Gemini Voice Error: " + err);
    return null;
  }
}

// =========================================================================
// تنفيذ الحركات وحفظها في Google Sheets وإرسال البطاقات التفاعلية
// =========================================================================
function executeParsedTransaction(chatId, item, senderName, data, isVoice) {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, "Africa/Algiers", "yyyy-MM-dd");
  var timeStr = Utilities.formatDate(now, "Africa/Algiers", "HH:mm:ss");
  var voiceTag = isVoice ? "🎙️ (تسجيل صوتي AI)" : "✍️ (رسالة نصية)";

  // 1. تحصيل دينار
  if (item.action === "collection") {
    var brId = item.branch || "batna";
    var branchNames = { batna: "باتنة (Batna)", blida: "البليدة (Blida)", oran: "وهران (Oran)", ogx: "OGX (العلمة)" };
    var brName = branchNames[brId] || brId;

    var newCol = {
      id: "c_" + now.getTime(),
      date: dateStr,
      time: timeStr,
      branchId: brId,
      amountDzd: Number(item.amount) || 0,
      paymentMethod: "cash",
      notes: "تسجيل " + voiceTag + (item.transcription ? " [" + item.transcription + "]" : ""),
      recordedBy: senderName,
      createdAt: now.toISOString()
    };

    if (!data.dzdCollections) data.dzdCollections = [];
    data.dzdCollections.unshift(newCol);
    saveAndUpdateSheets(data);

    var reply = "✅ <b>تم تسجيل استلام المبلغ بنجاح في الشيت!</b>\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "🏢 الفرع / المحل: <b>" + brName + "</b>\n" +
                "💰 المبلغ المقبوض: <b>" + formatNum(item.amount) + " د.ج</b>\n" +
                "💳 طريقة الدفع: <b>نقداً (Cash)</b>\n" +
                "👤 سجل بواسطة: <b>" + senderName + " " + voiceTag + "</b>\n" +
                "🕒 الوقت: <code>" + timeStr + "</code> (" + dateStr + ")\n" +
                (item.transcription ? "🗣️ <i>نص الصوت: '" + item.transcription + "'</i>\n" : "") +
                "━━━━━━━━━━━━━━━━━\n" +
                "📊 <i>تم تحديث ورقة تحصيلات الدينار ولوحة الخزينة تلقائياً.</i>";

    sendTelegramMessageToChat(chatId, reply);
    return;
  }

  // 2. تسديد مصنع (متعدد العملات EUR / USD)
  if (item.action === "payment") {
    var supId = item.supplierId || ("s_" + (item.supplier || "soydan"));
    var supName = item.supplierName || item.supplier || "المصنع";
    var curr = item.currency || (item.paidCurrency || "USD");
    var crossRate = 1.085;
    var rawAmt = Number(item.amount) || 0;
    var usdVal = curr === "EUR" ? (rawAmt * crossRate) : rawAmt;
    var eurVal = curr === "EUR" ? rawAmt : (rawAmt / crossRate);

    var newPay = {
      id: "pay_" + now.getTime(),
      date: dateStr,
      time: timeStr,
      supplierId: supId,
      notes: "تسديد " + voiceTag,
      paidCurrency: curr,
      amountPaid: rawAmt,
      crossRate: crossRate,
      amountEur: eurVal,
      totalPaidUsd: usdVal,
      branchAllocationsUsd: {},
      recordedBy: senderName,
      createdAt: now.toISOString()
    };

    if (!data.supplierPayments) data.supplierPayments = [];
    data.supplierPayments.unshift(newPay);
    saveAndUpdateSheets(data);

    var currSymbol = curr === "EUR" ? "€" : "$";
    var reply = "💳 <b>تم تسجيل تسديد المصنع بنجاح في الشيت!</b>\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "🏭 المصنع المستفيد: <b>" + supName + "</b>\n" +
                "💵 المبلغ المدفوع: <b>" + formatNum(rawAmt) + " " + currSymbol + " (" + curr + ")</b>\n" +
                (curr === "EUR" ? "💲 المعادل بالدولار (خصم الدين): <b>$" + formatNum(usdVal) + "</b> (بمعامل " + crossRate + ")\n" : "💶 المعادل بالأورو: <b>€" + formatNum(eurVal) + "</b>\n") +
                "👤 سجل بواسطة: <b>" + senderName + " " + voiceTag + "</b>\n" +
                "🕒 الوقت: <code>" + timeStr + "</code> (" + dateStr + ")\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "📉 <i>تم خصم المبلغ من ديون المصنع وتحديث الشيت فوراً.</i>";

    sendTelegramMessageToChat(chatId, reply);
    return;
  }

  // 3. فاتورة مصنع
  if (item.action === "invoice") {
    var supId = item.supplierId || ("s_" + (item.supplier || "soydan"));
    var supName = item.supplierName || item.supplier || "المصنع";

    var newInv = {
      id: "inv_" + now.getTime(),
      date: dateStr,
      time: timeStr,
      supplierId: supId,
      invoiceNumber: "",
      invoiceCurrency: "USD",
      totalAmountUsd: Number(item.amount) || 0,
      branchSharesUsd: {},
      notes: "فاتورة " + voiceTag,
      recordedBy: senderName,
      createdAt: now.toISOString()
    };

    if (!data.supplierInvoices) data.supplierInvoices = [];
    data.supplierInvoices.unshift(newInv);
    saveAndUpdateSheets(data);

    var reply = "📦 <b>تم تسجيل فاتورة السلعة بنجاح في الشيت!</b>\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "🏭 المصنع: <b>" + supName + "</b>\n" +
                "💲 قيمة الفاتورة: <b>$" + formatNum(item.amount) + "</b>\n" +
                "👤 سجل بواسطة: <b>" + senderName + " " + voiceTag + "</b>\n" +
                "🕒 الوقت: <code>" + timeStr + "</code> (" + dateStr + ")\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "📈 <i>تمت إضافة الفاتورة لحساب المصنع وتحديث الشيت فوراً.</i>";

    sendTelegramMessageToChat(chatId, reply);
    return;
  }
}

// =========================================================================
// دوال الاستعلامات والتقارير
// =========================================================================
function replyDettesSummary(chatId, data) {
  if (!data || !data.suppliers) {
    sendTelegramMessageToChat(chatId, "⚠️ لا توجد بيانات مسجلة بعد.");
    return;
  }
  var reply = "🏭 <b>كشف حساب المصانع والشركات التركية:</b>\n━━━━━━━━━━━━━━━━━\n";
  var totalInvoicesAll = 0;
  var totalPaidAll = 0;

  data.suppliers.forEach(function(sup) {
    var invSum = 0;
    (data.supplierInvoices || []).forEach(function(inv) {
      if (inv.supplierId === sup.id) invSum += (Number(inv.totalAmountUsd) || 0);
    });

    var paySum = 0;
    (data.supplierPayments || []).forEach(function(p) {
      if (p.supplierId === sup.id) paySum += (Number(p.totalPaidUsd) || 0);
    });

    var debt = invSum - paySum;
    totalInvoicesAll += invSum;
    totalPaidAll += paySum;

    if (invSum > 0 || paySum > 0) {
      var debtEur = debt / 1.085;
      if (debt > 0) {
        reply += "🔸 <b>" + sup.name + "</b>\n" +
                 "   • الفواتير: <code>$" + formatNum(invSum) + "</code>\n" +
                 "   • المسدد: <code>$" + formatNum(paySum) + "</code>\n" +
                 "   • 🔴 <b>الباقي له: $" + formatNum(debt) + " (€" + formatNum(debtEur) + ")</b>\n\n";
      } else {
        reply += "🔹 <b>" + sup.name + "</b> ⬅️ <b>خالص ومسدد بالكامل ✅</b>\n\n";
      }
    }
  });

  var totalRemainingDebt = totalInvoicesAll - totalPaidAll;
  var totalDebtEur = totalRemainingDebt / 1.085;
  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;
  var debtDzd = totalRemainingDebt * refRate;

  reply += "━━━━━━━━━━━━━━━━━\n" +
           "📦 <b>إجمالي الفواتير:</b> <code>$" + formatNum(totalInvoicesAll) + "</code>\n" +
           "💳 <b>إجمالي المسدد:</b> <code>$" + formatNum(totalPaidAll) + "</code>\n" +
           "🔴 <b>صافي الديون المتبقية:</b> <code>$" + formatNum(totalRemainingDebt) + "</code> (<code>€" + formatNum(totalDebtEur) + "</code>)\n" +
           "💵 <b>المعادل بالدينار:</b> <code>" + formatNum(debtDzd) + " د.ج</code>";

  sendTelegramMessageToChat(chatId, reply);
}

function replyMahlatSummary(chatId, data) {
  if (!data || !data.branches) {
    sendTelegramMessageToChat(chatId, "⚠️ لا توجد بيانات مسجلة بعد.");
    return;
  }
  var reply = "🏬 <b>كشف وضعية المحلات والفروع (الجزائر):</b>\n━━━━━━━━━━━━━━━━━\n";
  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;

  data.branches.forEach(function(b) {
    var dzdCol = 0;
    (data.dzdCollections || []).forEach(function(c) {
      if (c.branchId === b.id) dzdCol += (Number(c.amountDzd) || 0);
    });

    var dzdUsed = 0;
    (data.forexTransfers || []).forEach(function(f) {
      if (f.branchContributions && f.branchContributions[b.id]) {
        dzdUsed += (Number(f.branchContributions[b.id]) || 0);
      }
    });

    var restDzd = dzdCol - dzdUsed;

    var invUsd = 0;
    (data.supplierInvoices || []).forEach(function(inv) {
      if (inv.branchSharesUsd && inv.branchSharesUsd[b.id]) {
        invUsd += (Number(inv.branchSharesUsd[b.id]) || 0);
      }
    });

    var payUsd = 0;
    (data.supplierPayments || []).forEach(function(p) {
      if (p.branchAllocationsUsd && p.branchAllocationsUsd[b.id]) {
        payUsd += (Number(p.branchAllocationsUsd[b.id]) || 0);
      }
    });

    var netUsd = payUsd - invUsd;
    var netDzd = netUsd * refRate;

    reply += "📍 <b>" + b.name + ":</b>\n" +
             " • المقبوض دينار: <code>" + formatNum(dzdCol) + " د.ج</code>\n" +
             " • المستهلك للصرف: <code>" + formatNum(dzdUsed) + " د.ج</code>\n" +
             " • رصيد الدينار المتبقي: <code>" + formatNum(restDzd) + " د.ج</code>\n" +
             " • فواتير السلع: <code>$" + formatNum(invUsd) + "</code>\n" +
             " • المسدد للمصانع: <code>$" + formatNum(payUsd) + "</code>\n" +
             " • ⚖️ <b>الرصيد الصافي:</b> <code>$" + formatNum(netUsd) + "</code> (" + formatNum(netDzd) + " د.ج)\n\n";
  });
  reply += "━━━━━━━━━━━━━━━━━\n💡 <i>ملاحظة: الرصيد الموجب يعني أن الفرع دائن، والسالب مدين.</i>";
  sendTelegramMessageToChat(chatId, reply);
}

function replySoldeSummary(chatId, data) {
  if (!data) {
    sendTelegramMessageToChat(chatId, "⚠️ لا توجد بيانات مسجلة بعد.");
    return;
  }
  var totColDzd = 0;
  (data.dzdCollections || []).forEach(function(c) { totColDzd += (Number(c.amountDzd) || 0); });

  var totForexDzd = 0;
  (data.forexTransfers || []).forEach(function(f) { totForexDzd += (Number(f.totalDzd) || 0); });

  var totInvoicesUsd = 0;
  (data.supplierInvoices || []).forEach(function(i) { totInvoicesUsd += (Number(i.totalAmountUsd) || 0); });

  var totPaymentsUsd = 0;
  (data.supplierPayments || []).forEach(function(p) { totPaymentsUsd += (Number(p.totalPaidUsd) || 0); });

  var restCashDzd = totColDzd - totForexDzd;
  var remainingDebtUsd = totInvoicesUsd - totPaymentsUsd;

  var reply = "💰 <b>ملخص الخزينة والموقف المالي العام:</b>\n━━━━━━━━━━━━━━━━━\n" +
              "💵 <b>إجمالي مقبوضات الدينار:</b> <code>" + formatNum(totColDzd) + " د.ج</code>\n" +
              "💱 <b>إجمالي الدينار المصروف:</b> <code>" + formatNum(totForexDzd) + " د.ج</code>\n" +
              "🔹 <b>رصيد كاش الدينار المتبقي:</b> <code>" + formatNum(restCashDzd) + " د.ج</code>\n\n" +
              "📦 <b>إجمالي فواتير السلع:</b> <code>$" + formatNum(totInvoicesUsd) + "</code>\n" +
              "💳 <b>إجمالي المسدد للمصانع:</b> <code>$" + formatNum(totPaymentsUsd) + "</code>\n" +
              "🔴 <b>ديون المصانع المتبقية:</b> <code>$" + formatNum(remainingDebtUsd) + "</code>\n" +
              "━━━━━━━━━━━━━━━━━\n" +
              "🕒 <i>البيانات محدثة لحظياً</i>";

  sendTelegramMessageToChat(chatId, reply);
}

function replyForexSummary(chatId, data) {
  if (!data || !data.forexTransfers) {
    sendTelegramMessageToChat(chatId, "⚠️ لا توجد تحويلات صرف مسجلة بعد.");
    return;
  }
  var reply = "💱 <b>آخر عمليات تحويل وصرف العملات:</b>\n━━━━━━━━━━━━━━━━━\n";
  var transfers = (data.forexTransfers || []).slice(0, 5);
  transfers.forEach(function(f) {
    var brk = (data.brokers || []).find(function(b) { return b.id === f.brokerId; });
    var brkName = brk ? brk.name : (f.brokerId || "");
    reply += "📅 <b>" + f.date + "</b> (" + (f.time || "") + ")\n" +
             " • الوسيط: <b>" + brkName + "</b> | المستلم: <b>" + f.receiver + "</b>\n" +
             " • المبلغ: <code>" + formatNum(f.amountForeign) + " " + f.currency + "</code>\n" +
             " • سعر الصرف: <code>" + f.exchangeRateDzd + " د.ج</code>\n" +
             " • الإجمالي بالدينار: <code>" + formatNum(f.totalDzd) + " د.ج</code>\n\n";
  });
  sendTelegramMessageToChat(chatId, reply);
}

// =========================================================================
// 🧠 محرك التعرف الذكي على الكلام والدارجة الجزائرية (Darija NLP Engine)
// =========================================================================

function detectBranch(text) {
  var t = (text || "").toLowerCase();
  if (t.includes("باتنة") || t.includes("باتنه") || t.includes("batna")) return { id: "batna", name: "باتنة (Batna)" };
  if (t.includes("بليدة") || t.includes("البليدة") || t.includes("blida")) return { id: "blida", name: "البليدة (Blida)" };
  if (t.includes("وهران") || t.includes("وهارن") || t.includes("oran")) return { id: "oran", name: "وهران (Oran)" };
  if (t.includes("ogx") || t.includes("اوجي") || t.includes("او جي") || t.includes("العلمة") || t.includes("علمة") || t.includes("eulma")) return { id: "ogx", name: "OGX (العلمة)" };
  return null;
}

function detectSupplier(text, suppliersList) {
  var t = (text || "").toLowerCase();
  
  var aliases = [
    { keys: ["soydan", "سويف", "سويدان", "صويدان", "سعيدان"], id: "s_soydan", name: "Soydan" },
    { keys: ["civil", "سيفيل", "سيفل", "سيفيل صيف", "سيفيل شتاء"], id: "s_civil_demi", name: "Civil" },
    { keys: ["mutlu", "موتلو", "مطلو", "موتلو 2"], id: "s_mutlu_2", name: "Mutlu" },
    { keys: ["clementine", "كليمنتين", "كليمونتين", "كلمنتين"], id: "s_clementine", name: "Clementine" },
    { keys: ["elsima", "السيما", "السيمة", "إلسيما"], id: "s_elsima", name: "Elsima" },
    { keys: ["dalex", "دالكس", "ديلكس", "داليكس"], id: "s_dalex", name: "Dalex" },
    { keys: ["damasquino", "دمشقينو", "داماسكينو", "دمشق"], id: "s_damasquino", name: "Damasquino" },
    { keys: ["cikoby", "شيكوبي", "سيكوبي", "شيكوبي"], id: "s_cikoby", name: "Cikoby" },
    { keys: ["pengim", "بنجيم", "بينجيم", "بانجيم"], id: "s_pengim", name: "Pengim" },
    { keys: ["kocak", "كوتشاك", "كوجاك", "كوشاك"], id: "s_kocak", name: "Kocak" },
    { keys: ["bbs", "بي بي اس", "بيبي اس"], id: "s_bbs", name: "BBS" },
    { keys: ["exina", "اكسينا", "إكسينا", "اكزينا"], id: "s_exina", name: "Exina" },
    { keys: ["joi", "جوي", "جوي كيدز", "joi kids"], id: "s_joi_kids", name: "Joi Kids" },
    { keys: ["mdm", "ام دي ام", "ام ديم"], id: "s_mdm1", name: "MDM" },
    { keys: ["himms", "هيمس", "هي مس"], id: "s_himms", name: "HIMMS" }
  ];

  for (var i = 0; i < aliases.length; i++) {
    var item = aliases[i];
    for (var k = 0; k < item.keys.length; k++) {
      if (t.includes(item.keys[k])) {
        return { id: item.id, name: item.name };
      }
    }
  }

  if (suppliersList && suppliersList.length > 0) {
    for (var j = 0; j < suppliersList.length; j++) {
      var s = suppliersList[j];
      if (t.includes(s.name.toLowerCase()) || t.includes(s.id.toLowerCase())) {
        return s;
      }
    }
  }

  return null;
}

function extractNumber(text) {
  var t = (text || "").toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");

  var millionMatch = t.match(/(\d+(\.\d+)?)\s*(مليون|ملايين|ملاين|m)/);
  if (millionMatch) {
    var num = parseFloat(millionMatch[1]);
    if (num <= 1000) {
      return num * 10000;
    }
    return num * 1000000;
  }

  var thousandMatch = t.match(/(\d+(\.\d+)?)\s*(الف|ألف|k)/);
  if (thousandMatch) {
    return parseFloat(thousandMatch[1]) * 1000;
  }

  var matches = t.match(/\b\d+(\.\d+)?\b/g);
  if (matches && matches.length > 0) {
    return parseFloat(matches[0]);
  }

  return 0;
}

function saveAndUpdateSheets(data) {
  try {
    PropertiesService.getScriptProperties().setProperty("LATEST_DATA", JSON.stringify(data));
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var syncTimestamp = Utilities.formatDate(new Date(), "Africa/Algiers", "yyyy-MM-dd HH:mm:ss");

    var sheetDashboard = getOrCreateSheet(ss, "📊 لوحة الخزينة والأرصدة", 1);
    buildDashboardSheet(sheetDashboard, data, syncTimestamp);

    var sheetCollections = getOrCreateSheet(ss, "💵 تحصيلات الدينار DZD", 2);
    buildCollectionsSheet(sheetCollections, data.dzdCollections, data.branches);

    var sheetForex = getOrCreateSheet(ss, "💱 صرف العملات Forex", 3);
    buildForexSheet(sheetForex, data.forexTransfers, data.branches, data.brokers);

    var sheetInvoices = getOrCreateSheet(ss, "📦 فواتير المصانع USD", 4);
    buildInvoicesSheet(sheetInvoices, data.supplierInvoices, data.suppliers, data.branches);

    var sheetPayments = getOrCreateSheet(ss, "💳 تسديدات المصانع Payments", 5);
    buildPaymentsSheet(sheetPayments, data.supplierPayments, data.suppliers, data.branches);

    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log("Error in saveAndUpdateSheets: " + err);
  }
}

function getDefaultDataStructure() {
  return {
    branches: [
      { id: "batna", name: "باتنة (Batna)" },
      { id: "blida", name: "البليدة (Blida)" },
      { id: "oran", name: "وهران (Oran)" },
      { id: "ogx", name: "OGX (العلمة)" }
    ],
    brokers: [
      { id: "b_hich", name: "هشام (HICH)" }
    ],
    suppliers: [
      { id: "s_soydan", name: "Soydan" },
      { id: "s_civil_demi", name: "Civil Demi Season" },
      { id: "s_civil_summer", name: "Civil Summer" },
      { id: "s_exina", name: "Exina Demi Season" },
      { id: "s_joi_kids", name: "Joi Kids" },
      { id: "s_cikoby", name: "Cikoby" },
      { id: "s_pengim", name: "Pengim" },
      { id: "s_mutlu_2", name: "Mutlu 2" },
      { id: "s_mutlu_pdf1", name: "Mutlu Kids Wear PDF1" },
      { id: "s_mutlu_pdf2", name: "Mutlu Kids Wear PDF2" },
      { id: "s_clementine", name: "Clementine" },
      { id: "s_elsima", name: "Elsima" },
      { id: "s_dalex", name: "Dalex" },
      { id: "s_damasquino", name: "Damasquino" },
      { id: "s_bbs", name: "BBS" },
      { id: "s_kocak", name: "Kocak" },
      { id: "s_mdm1", name: "MDM 1" },
      { id: "s_mdm2", name: "MDM 2" },
      { id: "s_himms", name: "HIMMS" }
    ],
    dzdCollections: [],
    forexTransfers: [],
    supplierInvoices: [],
    supplierPayments: [],
    settings: { usdToDzdReferenceRate: 250.9677 }
  };
}

function sendTelegramMessageToChat(chatId, text) {
  var token = BOT_TOKEN || PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
  if (!token) return;

  var url = "https://api.telegram.org/bot" + token + "/sendMessage";
  var payload = { chat_id: chatId, text: text, parse_mode: "HTML" };

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function setTelegramWebhook() {
  var token = BOT_TOKEN || PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN");
  if (!token) {
    Logger.log("⚠️ يرجى التأكد من BOT_TOKEN!");
    return;
  }

  var finalUrl = WEB_APP_URL;
  if (!finalUrl || finalUrl === "") {
    var rawUrl = ScriptApp.getService().getUrl();
    if (rawUrl) {
      finalUrl = rawUrl.replace(/\/dev$/, "/exec");
    }
  }

  if (!finalUrl) {
    Logger.log("⚠️ يرجى نشر السكربت كـ Web App واختيار Anyone في صلاحيات الوصول!");
    return;
  }

  var url = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + encodeURIComponent(finalUrl);
  var response = UrlFetchApp.fetch(url);
  var res = response.getContentText();
  Logger.log("نتيجة الربط مع تيليغرام: " + res + " [الرابط: " + finalUrl + "]");
}

function formatNum(num) {
  var n = Number(num) || 0;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getOrCreateSheet(ss, sheetName, position) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, position - 1);
  }
  sheet.setRightToLeft(true);
  sheet.clear();
  return sheet;
}

function buildDashboardSheet(sheet, data, syncTimestamp) {
  var titleRange = sheet.getRange("A1:G1");
  titleRange.merge().setValue("🏢 مؤسسة الفتح (El Feth) - لوحة التحكم المالية والخزينة العامة");
  titleRange.setBackground("#064e3b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(14).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 40);

  var subRange = sheet.getRange("A2:G2");
  subRange.merge().setValue("🕒 تاريخ و وقت آخر مزامنة: " + syncTimestamp + " | إعداد: المدير العام (raouf) & Aminebens_off");
  subRange.setBackground("#ecfdf5").setFontColor("#065f46").setFontSize(10).setHorizontalAlignment("center");

  var cardHeaders = [["💵 إجمالي تحصيلات الدينار", "💱 إجمالي الدينار المصروف", "🔹 رصيد كاش الدينار المتبقي", "📦 إجمالي فواتير السلع USD", "💳 إجمالي المسدد للمصانع USD", "🔴 ديون المصانع المتبقية USD", "💵 معادل الديون بالدينار DZD"]];
  sheet.getRange("A4:G4").setValues(cardHeaders).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff").setHorizontalAlignment("center").setFontSize(10);
  
  var totCol = (data.dzdCollections || []).reduce(function(acc, c){ return acc + (Number(c.amountDzd) || 0); }, 0);
  var totForexDzd = (data.forexTransfers || []).reduce(function(acc, f){ return acc + (Number(f.totalDzd) || 0); }, 0);
  var restCashDzd = totCol - totForexDzd;
  var totInvUsd = (data.supplierInvoices || []).reduce(function(acc, i){ return acc + (Number(i.totalAmountUsd) || 0); }, 0);
  var totPayUsd = (data.supplierPayments || []).reduce(function(acc, p){ return acc + (Number(p.totalPaidUsd) || 0); }, 0);
  var remainingDebtUsd = totInvUsd - totPayUsd;
  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;
  var remainingDebtDzd = remainingDebtUsd * refRate;

  sheet.getRange("A5").setValue(totCol).setNumberFormat('#,##0 "د.ج"');
  sheet.getRange("B5").setValue(totForexDzd).setNumberFormat('#,##0 "د.ج"');
  sheet.getRange("C5").setValue(restCashDzd).setNumberFormat('#,##0 "د.ج"');
  sheet.getRange("D5").setValue(totInvUsd).setNumberFormat('"$"#,##0.00');
  sheet.getRange("E5").setValue(totPayUsd).setNumberFormat('"$"#,##0.00');
  sheet.getRange("F5").setValue(remainingDebtUsd).setNumberFormat('"$"#,##0.00');
  sheet.getRange("G5").setValue(remainingDebtDzd).setNumberFormat('#,##0 "د.ج"');

  sheet.getRange("A5:G5").setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center").setBackground("#f8fafc");
  sheet.getRange("C5").setFontColor("#059669");
  sheet.getRange("F5").setFontColor("#dc2626");

  var brHeader = sheet.getRange("A7:G7");
  brHeader.merge().setValue("🏬 الموقف المالي التفصيلي للفروع والمحلات (DZD & USD)");
  brHeader.setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");

  var brSub = ["الفرع / المحل", "المقبوض بالدينار", "المستهلك للصرف", "رصيد الدينار المتبقي", "فواتير السلع USD", "المسدد للمصانع USD", "الرصيد الصافي DZD"];
  sheet.getRange(8, 1, 1, brSub.length).setValues([brSub]).setBackground("#334155").setFontColor("#ffffff").setFontWeight("bold").setFontSize(10);

  var branchRows = [];
  (data.branches || []).forEach(function(b) {
    var bCol = (data.dzdCollections || []).filter(function(c){ return c.branchId === b.id; }).reduce(function(a, c){ return a + (Number(c.amountDzd) || 0); }, 0);
    var bForex = (data.forexTransfers || []).reduce(function(a, f){ return a + (Number((f.branchContributions && f.branchContributions[b.id]) || 0)); }, 0);
    var bRest = bCol - bForex;
    var bInv = (data.supplierInvoices || []).reduce(function(a, inv){ return a + (Number((inv.branchSharesUsd && inv.branchSharesUsd[b.id]) || 0)); }, 0);
    var bPay = (data.supplierPayments || []).reduce(function(a, pay){ return a + (Number((pay.branchAllocationsUsd && pay.branchAllocationsUsd[b.id]) || 0)); }, 0);
    var bNetDzd = (bPay - bInv) * refRate;

    branchRows.push([b.name, bCol, bForex, bRest, bInv, bPay, bNetDzd]);
  });

  if (branchRows.length > 0) {
    var brRange = sheet.getRange(9, 1, branchRows.length, brSub.length);
    brRange.setValues(branchRows);
    brRange.setFontSize(10);
    sheet.getRange(9, 2, branchRows.length, 3).setNumberFormat('#,##0 "د.ج"');
    sheet.getRange(9, 5, branchRows.length, 2).setNumberFormat('"$"#,##0.00');
    sheet.getRange(9, 7, branchRows.length, 1).setNumberFormat('#,##0 "د.ج"');
  }

  sheet.autoResizeColumns(1, 7);
}

function buildCollectionsSheet(sheet, collections, branches) {
  var headers = ["التاريخ", "الوقت", "الفرع / المحل", "المبلغ المقبوض (DZD)", "طريقة الدفع", "المستلم / المسجل", "ملاحظات وتفاصيل"];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#065f46").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  (collections || []).forEach(function(c) {
    var br = (branches || []).find(function(b) { return b.id === c.branchId; });
    var brName = br ? br.name : (c.branchId || "");
    var timeStr = c.time || (c.createdAt ? c.createdAt.substring(11, 19) : "--:--");
    rows.push([
      c.date || "",
      timeStr,
      brName,
      Number(c.amountDzd) || 0,
      c.paymentMethod === "cash" ? "نقداً (Cash)" : "تحويل",
      c.recordedBy || "المدير العام (raouf)",
      c.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0 "د.ج"').setFontWeight("bold");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("المجموع الكلي للمقبوضات").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setFormula("=SUM(D2:D" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#ecfdf5").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setNumberFormat('#,##0 "د.ج"');
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildForexSheet(sheet, forex, branches, brokers) {
  var headers = ["التاريخ", "الوقت", "الوسيط (Broker)", "المستلم في تركيا", "العملة الأجنبية", "المبلغ بالعملة الأجنبية", "سعر الصرف (DZD)", "الإجمالي بالدينار DZD", "مساهمة OGX", "مساهمة باتنة", "مساهمة البليدة", "مساهمة وهران", "المتبقي غير الموزع", "ملاحظات"];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  (forex || []).forEach(function(f) {
    var brk = (brokers || []).find(function(b) { return b.id === f.brokerId; });
    var brkName = brk ? brk.name : (f.brokerId || "");
    var timeStr = f.time || (f.createdAt ? f.createdAt.substring(11, 19) : "--:--");
    var contrib = f.branchContributions || {};

    rows.push([
      f.date || "",
      timeStr,
      brkName,
      f.receiver || "",
      f.currency || "EUR",
      Number(f.amountForeign) || 0,
      Number(f.exchangeRateDzd) || 0,
      Number(f.totalDzd) || 0,
      Number(contrib.ogx) || 0,
      Number(contrib.batna) || 0,
      Number(contrib.blida) || 0,
      Number(contrib.oran) || 0,
      Number(f.restDzd) || 0,
      f.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 6, rows.length, 1).setNumberFormat("#,##0.00");
    sheet.getRange(2, 7, rows.length, 1).setNumberFormat('#,##0.00 "د.ج"');
    sheet.getRange(2, 8, rows.length, 6).setNumberFormat('#,##0 "د.ج"');

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 5).merge().setValue("المجموع الكلي").setFontWeight("bold");
    sheet.getRange(totIdx, 6).setFormula("=SUM(F2:F" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 9).setFormula("=SUM(I2:I" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 10).setFormula("=SUM(J2:J" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 11).setFormula("=SUM(K2:K" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 12).setFormula("=SUM(L2:L" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 13).setFormula("=SUM(M2:M" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#eff6ff").setFontWeight("bold");
    sheet.getRange(totIdx, 6).setNumberFormat("#,##0.00");
    sheet.getRange(totIdx, 8, 1, 6).setNumberFormat('#,##0 "د.ج"');
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildInvoicesSheet(sheet, invoices, suppliers, branches) {
  var headers = ["التاريخ", "الوقت", "المصنع / الشركة", "رقم الفاتورة", "العملة", "إجمالي الفاتورة USD", "حصة OGX ($)", "حصة باتنة ($)", "حصة البليدة ($)", "حصة وهران ($)", "المسجل", "ملاحظات البضاعة"];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#831843").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  (invoices || []).forEach(function(inv) {
    var sup = (suppliers || []).find(function(s) { return s.id === inv.supplierId; });
    var supName = sup ? sup.name : (inv.supplierId || "");
    var timeStr = inv.time || (inv.createdAt ? inv.createdAt.substring(11, 19) : "--:--");
    var shares = inv.branchSharesUsd || {};

    rows.push([
      inv.date || "",
      timeStr,
      supName,
      inv.invoiceNumber || "",
      inv.invoiceCurrency || "USD",
      Number(inv.totalAmountUsd) || 0,
      Number(shares.ogx) || 0,
      Number(shares.batna) || 0,
      Number(shares.blida) || 0,
      Number(shares.oran) || 0,
      inv.recordedBy || "المدير العام (raouf)",
      inv.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 6, rows.length, 5).setNumberFormat('"$"#,##0.00');

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 5).merge().setValue("المجموع الكلي لفواتير المصانع").setFontWeight("bold");
    sheet.getRange(totIdx, 6).setFormula("=SUM(F2:F" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 7).setFormula("=SUM(G2:G" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 9).setFormula("=SUM(I2:I" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 10).setFormula("=SUM(J2:J" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#fdf2f8").setFontWeight("bold");
    sheet.getRange(totIdx, 6, 1, 5).setNumberFormat('"$"#,##0.00');
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildPaymentsSheet(sheet, payments, suppliers, branches) {
  var headers = ["التاريخ", "الوقت", "المصنع / الشركة", "المبلغ المسدد USD", "تخصيص OGX ($)", "تخصيص باتنة ($)", "تخصيص البليدة ($)", "تخصيص وهران ($)", "العملة", "المسجل", "ملاحظات التحويل"];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#3b0764").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  (payments || []).forEach(function(p) {
    var sup = (suppliers || []).find(function(s) { return s.id === p.supplierId; });
    var supName = sup ? sup.name : (p.supplierId || "");
    var timeStr = p.time || (p.createdAt ? p.createdAt.substring(11, 19) : "--:--");
    var alloc = p.branchAllocationsUsd || {};

    rows.push([
      p.date || "",
      timeStr,
      supName,
      Number(p.totalPaidUsd) || 0,
      Number(alloc.ogx) || 0,
      Number(alloc.batna) || 0,
      Number(alloc.blida) || 0,
      Number(alloc.oran) || 0,
      p.paidCurrency || "USD",
      p.recordedBy || "المدير العام (raouf)",
      p.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 4, rows.length, 5).setNumberFormat('"$"#,##0.00');

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("المجموع العام للمسدد للمصانع").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setFormula("=SUM(D2:D" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 5).setFormula("=SUM(E2:E" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 6).setFormula("=SUM(F2:F" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 7).setFormula("=SUM(G2:G" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#fdf2f8").setFontWeight("bold");
    sheet.getRange(totIdx, 4, 1, 5).setNumberFormat('"$"#,##0.00');
  }

  sheet.autoResizeColumns(1, headers.length);
}
