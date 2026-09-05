/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود المزامنة مع Google Sheets + الذكاء الاصطناعي للفويس والنصوص
 * المطور: Aminebens_off
 * المدير العام: raouf
 * =========================================================================
 * 
 * 🌟 الميزات المدعومة:
 * 1. 🎙️ فهم التسجيلات الصوتية (Voice Notes) بالدارجة الجزائرية بالذكاء الاصطناعي (Gemini AI) وتسجيلها في الشيت!
 * 2. ✍️ تسجيل العمليات بالنصوص والكلام العادي (مثل: "هزيت 500000 من باتنة").
 * 3. 📊 أوامر التقارير والاستعلامات الحية (/dettes, /mahlat, /solde, /forex).
 * 4. ⚡ مزامنة وتنسيق 5 أوراق عمل في Google Sheets تلقائياً بالوقت والتواريخ وتنسيق العملات.
 */

// 🔑 مفاتيح الربط
var BOT_TOKEN = "8520522099:AAFE0ONasErCxZsrd5hyMRSD5E-qx50gO4U"; 
var GEMINI_API_KEY = "AQ.Ab8RN6LcFbrYaP-Gfh6BG3SUyStHqPXpEqJAaSs9mM1v_Zkx7w";

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
  var chatId = message.chat.id;
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
      sendTelegramMessageToChat(chatId, "⚠️ <i>لم أتمكن من فهم العملية الصوتية بوضوح. يرجى تكرار التسجيل بصوت أوضح (مثال: هزيت خمسمائة ألف من باتنة).</i>");
      return;
    }

    // تنفيذ العملية المستخرجة من الفويس
    executeParsedTransaction(chatId, parsedAi, senderName, data, true);
    return;
  }

  // -----------------------------------------------------------------------
  // ✍️ 2. إذا كانت الرسالة نصية عادية
  // -----------------------------------------------------------------------
  var rawText = (message.text || "").trim();
  var text = rawText.toLowerCase();

  // فحص النصوص بالدارجة للتحصيلات
  var isCollection = text.includes("هزيت") || text.includes("قبضت") || text.includes("ديت") || 
                     text.includes("استلمت") || text.includes("تحصيل") || text.includes("كاش") ||
                     text.includes("دخلت") || text.includes("مقبوض");

  var branchMatch = detectBranch(text);
  var extractedAmount = extractNumber(text);

  if (isCollection && branchMatch && extractedAmount > 0) {
    executeParsedTransaction(chatId, {
      action: "collection",
      branch: branchMatch.id,
      branchName: branchMatch.name,
      amount: extractedAmount,
      notes: rawText
    }, senderName, data, false);
    return;
  }

  // فحص تسديدات المصانع
  var isPayment = text.includes("خلصت") || text.includes("دفعت") || text.includes("تسديد") || text.includes("سددت");
  var supplierMatch = detectSupplier(text, data.suppliers);

  if (isPayment && supplierMatch && extractedAmount > 0) {
    executeParsedTransaction(chatId, {
      action: "payment",
      supplierId: supplierMatch.id,
      supplierName: supplierMatch.name,
      amount: extractedAmount,
      notes: rawText
    }, senderName, data, false);
    return;
  }

  // فحص فواتير المصانع
  var isInvoice = text.includes("فاتورة") || text.includes("سلعة") || text.includes("شحنة");
  if (isInvoice && supplierMatch && extractedAmount > 0) {
    executeParsedTransaction(chatId, {
      action: "invoice",
      supplierId: supplierMatch.id,
      supplierName: supplierMatch.name,
      amount: extractedAmount,
      notes: rawText
    }, senderName, data, false);
    return;
  }

  // -----------------------------------------------------------------------
  // 📊 3. أوامر الاستعلام والكشوفات
  // -----------------------------------------------------------------------

  // أمر المساعدة /help
  if (text === "/start" || text === "/help" || text === "مساعدة" || text === "اوامر") {
    var reply = "🏢 <b>مرحباً بك " + senderName + " في المساعد الذكي لمؤسسة الفتح!</b>\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "🎙️ <b>يمكنك إرسال تسجيل صوتي (فويس) مباشرة:</b>\n" +
                "• سجل صوتك بالدارجة: <i>'هزيت خمسمية ألف من باتنة'</i>\n\n" +
                "✍️ <b>أو الكتابة بالدارجة العادية:</b>\n" +
                "• <code>هزيت 500000 من باتنة</code> ⬅️ تحصيل دينار\n" +
                "• <code>خلصت soydan 3000 دولار</code> ⬅️ تسديد مصنع\n" +
                "• <code>فاتورة civil 4500 دولار</code> ⬅️ فاتورة سلعة\n\n" +
                "📊 <b>أوامر الكشوفات الفورية:</b>\n" +
                "🏢 <b>/dettes</b> : ديون ومستحقات المصانع التركية\n" +
                "🏬 <b>/mahlat</b> : كشف ومقبوضات المحلات (باتنة، البليدة، وهران، OGX)\n" +
                "💰 <b>/solde</b> : ملخص الخزينة والموقف المالي العام\n" +
                "💱 <b>/forex</b> : آخر عمليات تحويل وصرف العملات\n\n" +
                "👨‍💻 <i>مؤسسة الفتح - Aminebens_off</i>";
    sendTelegramMessageToChat(chatId, reply);
    return;
  }

  // أمر ديون المصانع /dettes
  if (text.startsWith("/dette") || text.startsWith("/charikat") || text.includes("ديون") || text.includes("الشركات") || text.includes("المصانع")) {
    replyDettesSummary(chatId, data);
    return;
  }

  // أمر كشف المحلات /mahlat
  if (text.startsWith("/mahlat") || text.startsWith("/branch") || text.includes("المحلات") || text.includes("الفروع")) {
    replyMahlatSummary(chatId, data);
    return;
  }

  // أمر الخزينة /solde
  if (text.startsWith("/solde") || text.includes("الخزينة") || text.includes("رصيد")) {
    replySoldeSummary(chatId, data);
    return;
  }

  // أمر الصرف /forex
  if (text.startsWith("/forex") || text.includes("الصرف") || text.includes("الاورو")) {
    replyForexSummary(chatId, data);
    return;
  }

  // رد عام
  var defaultReply = "👋 أهلاً بك! يمكنك إرسال فويس صوتي 🎙️ أو رسالة مثل:\n" +
                     "• <code>هزيت 500000 من باتنة</code>\n" +
                     "• <code>خلصت soydan 3000 دولار</code>\n" +
                     "أو أرسل <b>/help</b> لعرض الأوامر.";
  sendTelegramMessageToChat(chatId, defaultReply);
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
    if (!geminiKey) return null;

    var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;

    var promptText = "أنت مساعد محاسبي لمؤسسة الفتح لاستيراد ملابس الأطفال بالجزائر. استمع لهذا التسجيل الصوتي بالدارجة الجزائرية واستخرج تفاصيل العملية. " +
                     "المحلات المتاحة: batna (باتنة), blida (البليدة), oran (وهران), ogx (أو جي إكس). " +
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
    var branchNames = { batna: "باتنة (Batna)", blida: "البليدة (Blida)", oran: "وهران (Oran)", ogx: "OGX" };
    var brName = branchNames[brId] || brId;

    var newCol = {
      id: "c_" + now.getTime(),
      date: dateStr,
      time: timeStr,
      branchId: brId,
      amountDzd: Number(item.amount) || 0,
      paymentMethod: "cash",
      notes: "تسجيل " + voiceTag + (item.transcription ? " [\" + item.transcription + "\"]" : ""),
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
                (item.transcription ? "🗣️ <i>نص الصوت: \"" + item.transcription + "\"</i>\n" : "") +
                "━━━━━━━━━━━━━━━━━\n" +
                "📊 <i>تم تحديث ورقة تحصيلات الدينار ولوحة الخزينة تلقائياً.</i>";

    sendTelegramMessageToChat(chatId, reply);
    return;
  }

  // 2. تسديد مصنع
  if (item.action === "payment") {
    var supId = item.supplierId || ("s_" + (item.supplier || "soydan"));
    var supName = item.supplierName || item.supplier || "المصنع";

    var newPay = {
      id: "pay_" + now.getTime(),
      date: dateStr,
      time: timeStr,
      supplierId: supId,
      notes: "تسديد " + voiceTag,
      paidCurrency: "USD",
      totalPaidUsd: Number(item.amount) || 0,
      branchAllocationsUsd: {},
      recordedBy: senderName,
      createdAt: now.toISOString()
    };

    if (!data.supplierPayments) data.supplierPayments = [];
    data.supplierPayments.unshift(newPay);
    saveAndUpdateSheets(data);

    var reply = "💳 <b>تم تسجيل تسديد المصنع بنجاح في الشيت!</b>\n" +
                "━━━━━━━━━━━━━━━━━\n" +
                "🏭 المصنع المستفيد: <b>" + supName + "</b>\n" +
                "💵 المبلغ المسدد: <b>$" + formatNum(item.amount) + "</b>\n" +
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
      if (debt > 0) {
        reply += "🔸 <b>" + sup.name + "</b>\n   • الفواتير: <code>$" + formatNum(invSum) + "</code> | المسدد: <code>$" + formatNum(paySum) + "</code>\n   • 🔴 <b>الباقي له: $" + formatNum(debt) + "</b>\n\n";
      } else {
        reply += "🔹 <b>" + sup.name + "</b> ⬅️ <b>خالص ومسدد بالكامل ✅</b>\n\n";
      }
    }
  });

  var totalRemainingDebt = totalInvoicesAll - totalPaidAll;
  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;
  var debtDzd = totalRemainingDebt * refRate;

  reply += "━━━━━━━━━━━━━━━━━\n" +
           "📦 <b>إجمالي الفواتير:</b> <code>$" + formatNum(totalInvoicesAll) + "</code>\n" +
           "💳 <b>إجمالي المسدد:</b> <code>$" + formatNum(totalPaidAll) + "</code>\n" +
           "🔴 <b>صافي الديون المتبقية للمصانع:</b> <code>$" + formatNum(totalRemainingDebt) + "</code>\n" +
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
// الدوال المساعدة للتحليل والحفظ
// =========================================================================
function detectBranch(text) {
  if (text.includes("باتنة") || text.includes("باتنه") || text.includes("batna")) return { id: "batna", name: "باتنة (Batna)" };
  if (text.includes("بليدة") || text.includes("البليدة") || text.includes("blida")) return { id: "blida", name: "البليدة (Blida)" };
  if (text.includes("وهران") || text.includes("oran")) return { id: "oran", name: "وهران (Oran)" };
  if (text.includes("ogx") || text.includes("اوجي") || text.includes("او جي")) return { id: "ogx", name: "OGX" };
  return null;
}

function detectSupplier(text, suppliersList) {
  var list = suppliersList || [
    { id: "s_soydan", name: "Soydan" },
    { id: "s_civil_demi", name: "Civil" },
    { id: "s_mutlu_2", name: "Mutlu" },
    { id: "s_clementine", name: "Clementine" },
    { id: "s_elsima", name: "Elsima" }
  ];

  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (text.includes(s.name.toLowerCase()) || text.includes(s.id.replace("s_", ""))) {
      return s;
    }
  }
  return null;
}

function extractNumber(text) {
  var cleaned = text.replace(/,/g, "").replace(/ /g, " ");
  var matches = cleaned.match(/\b\d+(\.\d+)?\b/g);
  if (matches && matches.length > 0) return Number(matches[0]);
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
    Logger.log("Error updating sheets: " + err);
  }
}

function getDefaultDataStructure() {
  return {
    branches: [
      { id: "batna", name: "باتنة (Batna)" },
      { id: "blida", name: "البليدة (Blida)" },
      { id: "oran", name: "وهران (Oran)" },
      { id: "ogx", name: "OGX" }
    ],
    brokers: [{ id: "b_hich", name: "هشام (HICH)" }],
    suppliers: [
      { id: "s_soydan", name: "Soydan" },
      { id: "s_civil_demi", name: "Civil" },
      { id: "s_mutlu_2", name: "Mutlu" },
      { id: "s_clementine", name: "Clementine" },
      { id: "s_elsima", name: "Elsima" }
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
    Logger.log("⚠️ يرجى كتابة BOT_TOKEN أولاً!");
    return;
  }

  var scriptAppUrl = ScriptApp.getService().getUrl();
  if (!scriptAppUrl) {
    Logger.log("⚠️ يرجى عمل Deploy as Web app أولاً!");
    return;
  }

  var url = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + encodeURIComponent(scriptAppUrl);
  var response = UrlFetchApp.fetch(url);
  Logger.log("نتيجة الربط: " + response.getContentText());
}

function formatNum(num) {
  var n = Number(num) || 0;
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// =========================================================================
// دوال بناء وتنسيق أوراق العمل في Google Sheets
// =========================================================================

function getOrCreateSheet(ss, name, index) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name, index - 1);
  }
  sheet.clear();
  sheet.clearFormats();
  sheet.setRightToLeft(true);
  return sheet;
}

function buildDashboardSheet(sheet, payload, syncTimestamp) {
  sheet.setFrozenRows(3);

  sheet.getRange("A1:H1").merge()
    .setValue("🏢 مؤسسة الفتح (El Feth) - لوحة الأرصدة والخزينة العامة للمؤسسة والفروع")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontSize(13)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  sheet.getRange("A2:H2").merge()
    .setValue("🕒 تاريخ ووقت آخر مزامنة حية: " + syncTimestamp + " | المشرف: raouf | المطور: Aminebens_off")
    .setBackground("#334155")
    .setFontColor("#94a3b8")
    .setFontSize(10)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(2, 24);

  var headers = [
    "الفرع / الشريك",
    "إجمالي المقبوضات (DZD)",
    "الدينار المستهلك للصرف (DZD)",
    "رصيد الدينار المتبقي (DZD)",
    "إجمالي فواتير السلع ($)",
    "إجمالي المسدد للمصانع ($)",
    "الرصيد الصافي بالدولار ($)",
    "الرصيد المعادل بالدينار (DZD)"
  ];
  
  sheet.getRange(3, 1, 1, headers.length).setValues([headers])
    .setBackground("#1e293b")
    .setFontColor("#f8fafc")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(3, 30);

  var refRate = (payload.settings && payload.settings.usdToDzdReferenceRate) ? Number(payload.settings.usdToDzdReferenceRate) : 250.9677;
  var rows = [];
  var branches = payload.branches || [
    { id: "batna", name: "باتنة (Batna)" },
    { id: "blida", name: "البليدة (Blida)" },
    { id: "oran", name: "وهران (Oran)" },
    { id: "ogx", name: "OGX" }
  ];

  branches.forEach(function(b) {
    var dzdCol = 0;
    (payload.dzdCollections || []).forEach(function(c) {
      if (c.branchId === b.id) dzdCol += (Number(c.amountDzd) || 0);
    });

    var dzdUsed = 0;
    (payload.forexTransfers || []).forEach(function(f) {
      if (f.branchContributions && f.branchContributions[b.id]) {
        dzdUsed += (Number(f.branchContributions[b.id]) || 0);
      }
    });

    var restDzd = dzdCol - dzdUsed;

    var invUsd = 0;
    (payload.supplierInvoices || []).forEach(function(inv) {
      if (inv.branchSharesUsd && inv.branchSharesUsd[b.id]) {
        invUsd += (Number(inv.branchSharesUsd[b.id]) || 0);
      }
    });

    var payUsd = 0;
    (payload.supplierPayments || []).forEach(function(p) {
      if (p.branchAllocationsUsd && p.branchAllocationsUsd[b.id]) {
        payUsd += (Number(p.branchAllocationsUsd[b.id]) || 0);
      }
    });

    var netUsd = payUsd - invUsd;
    var netDzd = netUsd * refRate;

    rows.push([b.name, dzdCol, dzdUsed, restDzd, invUsd, payUsd, netUsd, netDzd]);
  });

  if (rows.length > 0) {
    var dataRange = sheet.getRange(4, 1, rows.length, headers.length);
    dataRange.setValues(rows);
    dataRange.setFontSize(10).setVerticalAlignment("middle");

    sheet.getRange(4, 2, rows.length, 3).setNumberFormat("#,##0 \"د.ج\"");
    sheet.getRange(4, 5, rows.length, 3).setNumberFormat("\"$\"#,##0.00");
    sheet.getRange(4, 8, rows.length, 1).setNumberFormat("#,##0 \"د.ج\"");

    var totalRowIdx = 4 + rows.length;
    sheet.getRange(totalRowIdx, 1).setValue("المجموع العام للمؤسسة").setFontWeight("bold");
    sheet.getRange(totalRowIdx, 2).setFormula("=SUM(B4:B" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 3).setFormula("=SUM(C4:C" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 4).setFormula("=SUM(D4:D" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 5).setFormula("=SUM(E4:E" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 6).setFormula("=SUM(F4:F" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 7).setFormula("=SUM(G4:G" + (totalRowIdx - 1) + ")");
    sheet.getRange(totalRowIdx, 8).setFormula("=SUM(H4:H" + (totalRowIdx - 1) + ")");

    var totalRange = sheet.getRange(totalRowIdx, 1, 1, headers.length);
    totalRange.setBackground("#f1f5f9").setFontWeight("bold").setFontSize(11);
    sheet.getRange(totalRowIdx, 2, 1, 3).setNumberFormat("#,##0 \"د.ج\"");
    sheet.getRange(totalRowIdx, 5, 1, 3).setNumberFormat("\"$\"#,##0.00");
    sheet.getRange(totalRowIdx, 8, 1, 1).setNumberFormat("#,##0 \"د.ج\"");
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildCollectionsSheet(sheet, collections, branches) {
  sheet.setFrozenRows(1);
  var headers = ["التاريخ", "الوقت والساعة", "الفرع", "المبلغ بالدينار (DZD)", "طريقة الدفع", "المسؤول", "ملاحظات"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#065f46")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

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
      c.paymentMethod === "cash" ? "نقداً (Cash)" : (c.paymentMethod || "نقداً"),
      c.recordedBy || "المدير العام (raouf)",
      c.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat("#,##0 \"د.ج\"");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("إجمالي تحصيلات الدينار").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setFormula("=SUM(D2:D" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#ecfdf5").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setNumberFormat("#,##0 \"د.ج\"");
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildForexSheet(sheet, forex, branches, brokers) {
  sheet.setFrozenRows(1);
  var headers = [
    "التاريخ", "الوقت والساعة", "الوسيط والصراف", "المستلم في تركيا",
    "العملة", "المبلغ بالعملة", "سعر الصرف (DZD)", "الإجمالي بالدينار (DZD)",
    "حصة OGX (د.ج)", "حصة باتنة (د.ج)", "حصة البليدة (د.ج)", "حصة وهران (د.ج)",
    "الباقي (DZD)", "الحالة", "المسؤول", "ملاحظات"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#1e1b4b")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

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
      f.status === "confirmed" ? "مؤكد ومسلم" : (f.status || "مؤكد"),
      f.recordedBy || "المدير العام (raouf)",
      f.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");

    sheet.getRange(2, 6, rows.length, 1).setNumberFormat("#,##0.00");
    sheet.getRange(2, 7, rows.length, 1).setNumberFormat("0.00");
    sheet.getRange(2, 8, rows.length, 6).setNumberFormat("#,##0 \"د.ج\"");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 5).merge().setValue("المجموع الكلي لتحويلات الصرف").setFontWeight("bold");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 9).setFormula("=SUM(I2:I" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 10).setFormula("=SUM(J2:J" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 11).setFormula("=SUM(K2:K" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 12).setFormula("=SUM(L2:L" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 13).setFormula("=SUM(M2:M" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#eef2ff").setFontWeight("bold");
    sheet.getRange(totIdx, 8, 1, 6).setNumberFormat("#,##0 \"د.ج\"");
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildInvoicesSheet(sheet, invoices, suppliers, branches) {
  sheet.setFrozenRows(1);
  var headers = [
    "التاريخ", "الوقت والساعة", "المصنع / المورد", "الدولة",
    "رقم الفاتورة", "العملة", "حصة OGX ($)", "حصة باتنة ($)",
    "حصة البليدة ($)", "حصة وهران ($)", "المجموع الإجمالي ($)",
    "المسؤول", "ملاحظات"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#581c87")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

  var rows = [];
  (invoices || []).forEach(function(inv) {
    var sup = (suppliers || []).find(function(s) { return s.id === inv.supplierId; });
    var supName = sup ? sup.name : (inv.supplierId || "");
    var supCountry = sup ? sup.country : "تركيا";
    var timeStr = inv.time || (inv.createdAt ? inv.createdAt.substring(11, 19) : "--:--");
    var sh = inv.branchSharesUsd || {};

    rows.push([
      inv.date || "",
      timeStr,
      supName,
      supCountry,
      inv.invoiceNumber || "",
      inv.invoiceCurrency || "USD",
      Number(sh.ogx) || 0,
      Number(sh.batna) || 0,
      Number(sh.blida) || 0,
      Number(sh.oran) || 0,
      Number(inv.totalAmountUsd) || 0,
      inv.recordedBy || "المدير العام (raouf)",
      inv.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 7, rows.length, 5).setNumberFormat("\"$\"#,##0.00");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 6).merge().setValue("المجموع العام لفواتير السلع").setFontWeight("bold");
    sheet.getRange(totIdx, 7).setFormula("=SUM(G2:G" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 9).setFormula("=SUM(I2:I" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 10).setFormula("=SUM(J2:J" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 11).setFormula("=SUM(K2:K" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#faf5ff").setFontWeight("bold");
    sheet.getRange(totIdx, 7, 1, 5).setNumberFormat("\"$\"#,##0.00");
  }

  sheet.autoResizeColumns(1, headers.length);
}

function buildPaymentsSheet(sheet, payments, suppliers, branches) {
  sheet.setFrozenRows(1);
  var headers = [
    "التاريخ", "الوقت والساعة", "المصنع المستفيد", "المبلغ المسدد ($)",
    "حصة OGX ($)", "حصة باتنة ($)", "حصة البليدة ($)", "حصة وهران ($)",
    "العملة", "المسؤول", "ملاحظات"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground("#831843")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

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
    sheet.getRange(2, 4, rows.length, 5).setNumberFormat("\"$\"#,##0.00");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("المجموع العام للمسدد للمصانع").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setFormula("=SUM(D2:D" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 5).setFormula("=SUM(E2:E" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 6).setFormula("=SUM(F2:F" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 7).setFormula("=SUM(G2:G" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 8).setFormula("=SUM(H2:H" + (totIdx - 1) + ")");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#fdf2f8").setFontWeight("bold");
    sheet.getRange(totIdx, 4, 1, 5).setNumberFormat("\"$\"#,##0.00");
  }

  sheet.autoResizeColumns(1, headers.length);
}
