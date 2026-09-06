/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - بوت تيليغرام المطور v3.0 (Executive AI Assistant)
 * المطور: Aminebens_off
 * المدير العام: السيد رؤوف (raouf)
 * 
 * 📌 المميزات المدمجة:
 * 1. 🎛️ لوحة أزرار تفاعلية دائمة (Reply Keyboards) + أزرار ذكية (Inline Keyboards)
 * 2. 📊 كشوفات تفصيلية فورية لكل مصنع ولكل فرع
 * 3. 📄 تقارير PDF وجداول نصية جاهزة للتنزيل والطباعة بضغطة زر
 * 4. 🎙️ معالجة الفويس والدارجة بالذكاء الاصطناعي (Gemini AI)
 * 5. ⚡ تسجيل مباشر وتحديث فوري لحالة الخزينة
 * =========================================================================
 */

var BOT_TOKEN = "8520522099:AAFE0ONasErCxZsrd5hyMRSD5E-qx50gO4U";
var GEMINI_API_KEY = "AQ.Ab8RN6IdURWMkkoJz7ONupzHtZuowmqIHSSh9dXioMJx-Q0vhQ";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("No Post Data").setMimeType(ContentService.MimeType.TEXT);
    }

    var contents = e.postData.contents;
    var payload = JSON.parse(contents);

    // 1. معالجة نقرات الأزرار التفاعلية (Inline Callback Query)
    if (payload.callback_query) {
      handleCallbackQuery(payload.callback_query);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    // 2. معالجة الرسائل العادية (نصوص أو صوتيات)
    if (payload.message) {
      handleTelegramMessage(payload.message);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService.createTextOutput("No action").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    console.error("doPost error:", err);
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// 🎛️ معالج نقرات الأزرار الذكية (Inline Keyboards Callbacks)
// =========================================================================
function handleCallbackQuery(cb) {
  try {
    var callbackId = cb.id;
    var dataCode = cb.data || "";
    var chatId = cb.message ? cb.message.chat.id : null;

    if (!chatId) return;

    // تأكيد استلام النقر لتيليغرام (Answer Callback Query)
    answerCallbackQuery(callbackId);

    var data = getLedgerData();

    if (dataCode === "cmd_solde") {
      replySoldeSummary(chatId, data);
    } else if (dataCode === "cmd_dettes") {
      replyDettesSummary(chatId, data);
    } else if (dataCode === "cmd_mahlat") {
      replyMahlatSummary(chatId, data);
    } else if (dataCode === "cmd_forex") {
      replyForexSummary(chatId, data);
    } else if (dataCode === "cmd_suppliers_menu") {
      sendSuppliersReportMenu(chatId, data);
    } else if (dataCode === "cmd_branches_menu") {
      sendBranchesReportMenu(chatId, data);
    } else if (dataCode.startsWith("sup_rep_")) {
      var supId = dataCode.replace("sup_rep_", "");
      sendSupplierDetailedReport(chatId, supId, data);
    } else if (dataCode.startsWith("br_rep_")) {
      var brId = dataCode.replace("br_rep_", "");
      sendBranchDetailedReport(chatId, brId, data);
    } else if (dataCode === "cmd_pdf_all") {
      generateAndSendLedgerPdf(chatId, data);
    } else if (dataCode === "cmd_quick_help") {
      sendWelcomeAndMainMenu(chatId, cb.from ? cb.from.first_name : "المدير");
    }

  } catch (err) {
    console.error("handleCallbackQuery error:", err);
  }
}

// =========================================================================
// ✍️ معالج الرسائل النصية والصوتية
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
        return;
      }
      cache.put("MSG_" + msgId, "1", 600);
    }

    var senderName = message.from ? (message.from.first_name || "المدير") : "المدير";
    var data = getLedgerData();

    // 🎙️ 1. تسجيل صوتي (Voice Note)
    if (message.voice || message.audio) {
      var voiceObj = message.voice || message.audio;
      sendTelegramMessageToChat(chatId, "⏳ <i>جاري الاستماع للرسالة الصوتية وتحليلها بالذكاء الاصطناعي...</i>");
      
      var parsedAi = processVoiceWithGemini(voiceObj.file_id);
      if (!parsedAi || !parsedAi.action || parsedAi.action === "unknown" || !parsedAi.amount) {
        sendTelegramMessageToChat(chatId, "⚠️ <b>تعذر استيعاب الصوت تلقائياً</b>\nتأكد من وضوح الصوت وذكر المصنع أو المبلغ بالدارجة.\n\n💡 <i>يمكنك أيضاً الضغط على أزرار التحكم أدناه أو كتابة النص!</i>");
        return;
      }

      executeParsedTransaction(chatId, parsedAi, senderName, data, true);
      return;
    }

    // ✍️ 2. رسالة نصية أو أمر
    var rawText = (message.text || "").trim();
    var text = rawText.toLowerCase();

    // القائمة الرئيسية والأوامر
    if (text === "/start" || text === "/help" || text === "القائمة الرئيسية" || text === "مساعدة" || text === "أوامر") {
      sendWelcomeAndMainMenu(chatId, senderName);
      return;
    }

    // مطابقة أزرار لوحة المفاتيح الدائمة (Reply Keyboard Buttons)
    if (text.includes("خزينة") || text.includes("رصيد") || text === "/solde" || text === "💰 رصيد الخزينة") {
      replySoldeSummary(chatId, data);
      return;
    }

    if (text.includes("ديون") || text.includes("شركات") || text.includes("مصانع") || text === "/dettes" || text === "🏭 ديون المصانع") {
      replyDettesSummary(chatId, data);
      return;
    }

    if (text.includes("محلات") || text.includes("فروع") || text === "/mahlat" || text === "🏬 كشف الفروع") {
      replyMahlatSummary(chatId, data);
      return;
    }

    if (text.includes("صرف") || text.includes("forex") || text.includes("أورو") || text.includes("اورو") || text === "/forex" || text === "💱 حركة الصرف Forex") {
      replyForexSummary(chatId, data);
      return;
    }

    if (text.includes("pdf") || text.includes("تقرير شامل") || text === "📄 تقرير شامل PDF") {
      generateAndSendLedgerPdf(chatId, data);
      return;
    }

    if (text.includes("كشف مصنع") || text === "📋 كشوفات تفصيلية") {
      sendSuppliersReportMenu(chatId, data);
      return;
    }

    // محاولة تحليل المعاملة بالدارجة
    var parsed = parseArabicTransactionText(rawText, data);
    if (parsed && parsed.action !== "unknown" && parsed.amount > 0) {
      executeParsedTransaction(chatId, parsed, senderName, data, false);
      return;
    }

    // رد افتراضي ذكي
    sendTelegramMessageToChat(chatId, 
      "👋 مرحباً <b>" + senderName + "</b>\n" +
      "لم أتعرف على الأمر بدقة. يمكنك الاختيار من <b>الأزرار في الأسفل 👇</b> أو كتابة العملية مباشرة مثل:\n" +
      "• <code>هزيت 15 مليون من العلمة</code>\n" +
      "• <code>خلصت سويف 3000 دولار منها 2500 اورو</code>"
    );

  } catch (err) {
    console.error("handleTelegramMessage error:", err);
  }
}

// =========================================================================
// 🌟 دوال عرض القوائم والأزرار التفاعلية
// =========================================================================

function sendWelcomeAndMainMenu(chatId, senderName) {
  var text = "🏢 <b>مرحباً بك " + senderName + " في المنظومة الذكية لمؤسسة الفتح (El Feth)</b>\n" +
             "━━━━━━━━━━━━━━━━━\n" +
             "⚡ <b>لوحة التحكم التنفيذية بين يديك:</b>\n" +
             "اختر ما تريد مراجعته بضغطة زر، أو سجّل عملياتك فورياً بالصوت أو النص.\n\n" +
             "👨‍💻 <i>إشراف: المدير العام (السيد رؤوف) | التطوير: Aminebens_off</i>";

  var inlineButtons = [
    [
      { text: "💰 رصيد الخزينة والسيولة", callback_data: "cmd_solde" },
      { text: "🏭 ديون ومستحقات المصانع", callback_data: "cmd_dettes" }
    ],
    [
      { text: "🏬 كشف المحلات والفروع", callback_data: "cmd_mahlat" },
      { text: "💱 تحويلات الصرف Forex", callback_data: "cmd_forex" }
    ],
    [
      { text: "📋 كشف مصنع محدد", callback_data: "cmd_suppliers_menu" },
      { text: "🏬 كشف فرع محدد", callback_data: "cmd_branches_menu" }
    ],
    [
      { text: "📄 استخراج تقرير PDF شامل", callback_data: "cmd_pdf_all" }
    ]
  ];

  sendTelegramMessageWithInline(chatId, text, inlineButtons);
  sendPersistentReplyKeyboard(chatId);
}

function sendPersistentReplyKeyboard(chatId) {
  var keyboard = [
    ["💰 رصيد الخزينة", "🏭 ديون المصانع"],
    ["🏬 كشف الفروع", "💱 حركة الصرف Forex"],
    ["📋 كشوفات تفصيلية", "📄 تقرير شامل PDF"]
  ];

  var payload = {
    chat_id: chatId,
    text: "🔘 <i>لوحة الأزرار السريعة مفعلة في الأسفل دائماً</i> 👇",
    parse_mode: "HTML",
    reply_markup: {
      keyboard: keyboard.map(function(row) {
        return row.map(function(btnText) { return { text: btnText }; });
      }),
      resize_keyboard: true,
      persistent: true
    }
  };

  sendRawTelegramApi("sendMessage", payload);
}

function sendSuppliersReportMenu(chatId, data) {
  var suppliers = data.suppliers || [];
  if (suppliers.length === 0) {
    sendTelegramMessageToChat(chatId, "⚠️ لا توجد مصانع مسجلة حالياً.");
    return;
  }

  var inlineButtons = [];
  for (var i = 0; i < suppliers.length; i += 2) {
    var row = [];
    row.push({ text: "🏭 " + suppliers[i].name, callback_data: "sup_rep_" + suppliers[i].id });
    if (i + 1 < suppliers.length) {
      row.push({ text: "🏭 " + suppliers[i+1].name, callback_data: "sup_rep_" + suppliers[i+1].id });
    }
    inlineButtons.push(row);
  }
  inlineButtons.push([{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_quick_help" }]);

  sendTelegramMessageWithInline(chatId, "📋 <b>اختر المصنع لعرض كشف حسابه التفصيلي:</b>", inlineButtons);
}

function sendBranchesReportMenu(chatId, data) {
  var branches = data.branches || [];
  var inlineButtons = [];
  for (var i = 0; i < branches.length; i += 2) {
    var row = [];
    row.push({ text: "🏬 " + branches[i].name, callback_data: "br_rep_" + branches[i].id });
    if (i + 1 < branches.length) {
      row.push({ text: "🏬 " + branches[i+1].name, callback_data: "br_rep_" + branches[i+1].id });
    }
    inlineButtons.push(row);
  }
  inlineButtons.push([{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_quick_help" }]);

  sendTelegramMessageWithInline(chatId, "🏬 <b>اختر المحل / الفرع لعرض كشفه المالي:</b>", inlineButtons);
}

// =========================================================================
// 📊 دوال الكشوفات والحسابات المالية
// =========================================================================

function replySoldeSummary(chatId, data) {
  var totCol = (data.dzdCollections || []).reduce(function(acc, c){ return acc + (Number(c.amountDzd) || 0); }, 0);
  var totForexDzd = (data.forexTransfers || []).reduce(function(acc, f){ return acc + (Number(f.totalDzd) || 0); }, 0);
  var restCashDzd = totCol - totForexDzd;

  var totEurBought = (data.forexTransfers || []).filter(function(f){ return f.currency === 'EUR'; }).reduce(function(a, f){ return a + (Number(f.amountForeign) || 0); }, 0);
  var totEurPaid = (data.supplierPayments || []).filter(function(p){ return p.paidCurrency === 'EUR'; }).reduce(function(a, p){ return a + (Number(p.amountPaid) || 0); }, 0);
  var restEur = totEurBought - totEurPaid;

  var totUsdInv = (data.supplierInvoices || []).reduce(function(a, i){ return a + (Number(i.totalAmountUsd) || 0); }, 0);
  var totUsdPay = (data.supplierPayments || []).reduce(function(a, p){ return a + (Number(p.totalPaidUsd) || 0); }, 0);
  var remainingDebtUsd = totUsdInv - totUsdPay;

  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;
  var debtDzdEquiv = remainingDebtUsd * refRate;

  var msg = "💰 <b>الموقف المالي وحالة الخزينة العامة</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "💵 <b>رصيد كاش الدينار (DZD):</b>\n" +
            "• الإجمالي المحصل: <b>" + formatDzd(totCol) + "</b>\n" +
            "• المستهلك للصرف: <b>" + formatDzd(totForexDzd) + "</b>\n" +
            "👉 <b>الرصيد المتبقي: " + formatDzd(restCashDzd) + "</b> " + (restCashDzd >= 0 ? "🟢" : "🔴") + "\n\n" +
            "💶 <b>رصيد الأورو الجاري المتاح (EUR):</b>\n" +
            "• المشترى: <b>€" + formatNumber(totEurBought) + "</b>\n" +
            "• المسدد للمصانع: <b>€" + formatNumber(totEurPaid) + "</b>\n" +
            "👉 <b>المتبقي المتاح: €" + formatNumber(restEur) + "</b> 🟢\n\n" +
            "🔴 <b>ديون المصانع المتبقية:</b>\n" +
            "• الإجمالي بالدولار: <b>$" + formatNumber(remainingDebtUsd) + "</b>\n" +
            "• المعادل بالدينار: <b>" + formatDzd(debtDzdEquiv) + "</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "🕒 <i>محدث لحظياً ومطابق للمنظومة</i>";

  var buttons = [
    [
      { text: "🏭 كشف المصانع", callback_data: "cmd_dettes" },
      { text: "🏬 كشف الفروع", callback_data: "cmd_mahlat" }
    ],
    [
      { text: "📄 استخراج كشف PDF", callback_data: "cmd_pdf_all" }
    ]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

function replyDettesSummary(chatId, data) {
  var suppliers = data.suppliers || [];
  var invoices = data.supplierInvoices || [];
  var payments = data.supplierPayments || [];

  var totalAllInvoices = 0;
  var totalAllPayments = 0;
  var lines = [];

  suppliers.forEach(function(sup) {
    var supInvoices = invoices.filter(function(i){ return i.supplierId === sup.id; }).reduce(function(a, i){ return a + (Number(i.totalAmountUsd) || 0); }, 0);
    var supPayments = payments.filter(function(p){ return p.supplierId === sup.id; }).reduce(function(a, p){ return a + (Number(p.totalPaidUsd) || 0); }, 0);
    var balance = supInvoices - supPayments;

    totalAllInvoices += supInvoices;
    totalAllPayments += supPayments;

    if (supInvoices > 0 || supPayments > 0) {
      var icon = balance <= 0 ? "✅ خالص" : "🔴 يسال: <b>$" + formatNumber(balance) + "</b>";
      lines.push("• <b>" + sup.name + "</b> ⬅️ " + icon);
    }
  });

  var totalRemaining = totalAllInvoices - totalAllPayments;

  var msg = "🏭 <b>كشف ديون ومستحقات المصانع التركية</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            (lines.length > 0 ? lines.join("\n") : "لا توجد حركات مسجلة") + "\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "📦 إجمالي الفواتير: <b>$" + formatNumber(totalAllInvoices) + "</b>\n" +
            "💳 إجمالي المسدد: <b>$" + formatNumber(totalAllPayments) + "</b>\n" +
            "🔴 <b>المتبقي الإجمالي الواجب سداده: $" + formatNumber(totalRemaining) + "</b>";

  var buttons = [
    [{ text: "📋 كشف مصنع محدد بالتفصيل", callback_data: "cmd_suppliers_menu" }],
    [{ text: "💰 رصيد الخزينة", callback_data: "cmd_solde" }]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

function replyMahlatSummary(chatId, data) {
  var branches = data.branches || [];
  var collections = data.dzdCollections || [];
  var forex = data.forexTransfers || [];
  var invoices = data.supplierInvoices || [];
  var payments = data.supplierPayments || [];

  var lines = [];
  branches.forEach(function(b) {
    var bCol = collections.filter(function(c){ return c.branchId === b.id; }).reduce(function(a, c){ return a + (Number(c.amountDzd) || 0); }, 0);
    var bForex = forex.reduce(function(a, f){ return a + (Number((f.branchContributions && f.branchContributions[b.id]) || 0)); }, 0);
    var restCash = bCol - bForex;

    var bInv = invoices.reduce(function(a, i){ return a + (Number((i.branchSharesUsd && i.branchSharesUsd[b.id]) || 0)); }, 0);
    var bPay = payments.reduce(function(a, p){ return a + (Number((p.branchAllocationsUsd && p.branchAllocationsUsd[b.id]) || 0)); }, 0);

    lines.push(
      "🏬 <b>" + b.name + " (" + b.city + ")</b>\n" +
      "• المقبوض DZD: <b>" + formatDzd(bCol) + "</b>\n" +
      "• مساهمة الصرف: <b>" + formatDzd(bForex) + "</b>\n" +
      "• فائض/عجز الكاش: <b>" + formatDzd(restCash) + "</b> " + (restCash >= 0 ? "🟢" : "🔴") + "\n" +
      "• السلع المستلمة: <b>$" + formatNumber(bInv) + "</b> | المسدد: <b>$" + formatNumber(bPay) + "</b>\n"
    );
  });

  var msg = "🏬 <b>الموقف المالي التفصيلي للمحلات والفروع</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            lines.join("\n━━━━━━━━━━━━━━━━━\n");

  var buttons = [
    [{ text: "🏬 اختيار فرع لكشف الحساب", callback_data: "cmd_branches_menu" }],
    [{ text: "💰 الخزينة الرئيسية", callback_data: "cmd_solde" }]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

function replyForexSummary(chatId, data) {
  var transfers = data.forexTransfers || [];
  var brokers = data.brokers || [];

  var recent = transfers.slice(0, 5);
  var lines = [];

  recent.forEach(function(f, idx) {
    var brk = brokers.find(function(b){ return b.id === f.brokerId; });
    var brkName = brk ? brk.name : (f.brokerId || "وسيط");
    var curSymbol = f.currency === 'EUR' ? '€' : '$';

    lines.push(
      (idx + 1) + ". <b>" + f.date + "</b> | " + brkName + "\n" +
      "   💰 المبلغ: <b>" + curSymbol + formatNumber(f.amountForeign) + "</b> بسعر: <b>" + f.exchangeRateDzd + " دج</b>\n" +
      "   💵 التكلفة: <b>" + formatDzd(f.totalDzd) + "</b>"
    );
  });

  var msg = "💱 <b>آخر عمليات صرف العملات الأجنبية Forex</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            (lines.length > 0 ? lines.join("\n\n") : "لا توجد عمليات مسجلة") + "\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "⚡ <i>يتم خصم المبالغ تلقائياً من تحصيلات الفروع</i>";

  var buttons = [
    [{ text: "💰 رصيد الخزينة المتاح", callback_data: "cmd_solde" }],
    [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_quick_help" }]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

function sendSupplierDetailedReport(chatId, supplierId, data) {
  var sup = (data.suppliers || []).find(function(s){ return s.id === supplierId; });
  if (!sup) {
    sendTelegramMessageToChat(chatId, "⚠️ المصنع غير موجود.");
    return;
  }

  var invs = (data.supplierInvoices || []).filter(function(i){ return i.supplierId === supplierId; });
  var pays = (data.supplierPayments || []).filter(function(p){ return p.supplierId === supplierId; });

  var totInv = invs.reduce(function(a, i){ return a + (Number(i.totalAmountUsd) || 0); }, 0);
  var totPay = pays.reduce(function(a, p){ return a + (Number(p.totalPaidUsd) || 0); }, 0);
  var bal = totInv - totPay;

  var msg = "🏢 <b>كشف حساب مصنع: " + sup.name + " (" + (sup.country || "تركيا") + ")</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "📦 <b>إجمالي الفواتير: $" + formatNumber(totInv) + "</b> (" + invs.length + " فاتورة)\n" +
            "💳 <b>إجمالي المسدد: $" + formatNumber(totPay) + "</b> (" + pays.length + " دفعة)\n" +
            "👉 <b>الرصيد الصافي: " + (bal <= 0 ? "✅ خالص تماماً" : "🔴 يسال: <b>$" + formatNumber(bal) + "</b>") + "</b>\n\n" +
            "<b>📜 آخر الفواتير والدفعات:</b>\n";

  var history = [];
  invs.slice(0, 3).forEach(function(i){ history.push("• 📦 فاتورة: $" + formatNumber(i.totalAmountUsd) + " بتاريخ " + i.date); });
  pays.slice(0, 3).forEach(function(p){ history.push("• 💳 سداد: $" + formatNumber(p.totalPaidUsd) + " (" + (p.amountPaid || 0) + (p.paidCurrency || "$") + ") بتاريخ " + p.date); });

  msg += (history.length > 0 ? history.join("\n") : "لا توجد تفاصيل إضافية");

  var buttons = [
    [{ text: "🔙 قائمة المصانع", callback_data: "cmd_suppliers_menu" }],
    [{ text: "🏠 القائمة الرئيسية", callback_data: "cmd_quick_help" }]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

function sendBranchDetailedReport(chatId, branchId, data) {
  var br = (data.branches || []).find(function(b){ return b.id === branchId; });
  if (!br) {
    sendTelegramMessageToChat(chatId, "⚠️ الفرع غير موجود.");
    return;
  }

  var bCol = (data.dzdCollections || []).filter(function(c){ return c.branchId === branchId; }).reduce(function(a, c){ return a + (Number(c.amountDzd) || 0); }, 0);
  var bForex = (data.forexTransfers || []).reduce(function(a, f){ return a + (Number((f.branchContributions && f.branchContributions[branchId]) || 0)); }, 0);
  var restCash = bCol - bForex;

  var bInv = (data.supplierInvoices || []).reduce(function(a, i){ return a + (Number((i.branchSharesUsd && i.branchSharesUsd[branchId]) || 0)); }, 0);
  var bPay = (data.supplierPayments || []).reduce(function(a, p){ return a + (Number((p.branchAllocationsUsd && p.branchAllocationsUsd[branchId]) || 0)); }, 0);

  var msg = "🏬 <b>كشف حساب فرع: " + br.name + " (" + br.city + ")</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "💵 <b>حساب الدينار الجزائري DZD:</b>\n" +
            "• المقبوض كاش وتحويل: <b>" + formatDzd(bCol) + "</b>\n" +
            "• المستهلك لشراء الصرف: <b>" + formatDzd(bForex) + "</b>\n" +
            "👉 <b>الرصيد المتبقي: " + formatDzd(restCash) + "</b> " + (restCash >= 0 ? "🟢" : "🔴") + "\n\n" +
            "📦 <b>حساب السلع والمصانع USD:</b>\n" +
            "• حصة السلع المستلمة: <b>$" + formatNumber(bInv) + "</b>\n" +
            "• المسدد من طرف الفرع: <b>$" + formatNumber(bPay) + "</b>\n" +
            "👉 <b>الفارق: $" + formatNumber(bInv - bPay) + "</b>";

  var buttons = [
    [{ text: "🔙 قائمة الفروع", callback_data: "cmd_branches_menu" }],
    [{ text: "🏠 القائمة الرئيسية", callback_data: "cmd_quick_help" }]
  ];

  sendTelegramMessageWithInline(chatId, msg, buttons);
}

// =========================================================================
// 📄 استخراج تقرير شامل بصيغة PDF وإرساله مباشرة
// =========================================================================
function generateAndSendLedgerPdf(chatId, data) {
  sendTelegramMessageToChat(chatId, "⏳ <i>جاري إنشاء وتنسيق تقرير PDF الشامل للمنظومة...</i>");

  try {
    var syncTimestamp = Utilities.formatDate(new Date(), "Africa/Algiers", "yyyy-MM-dd HH:mm");
    
    var html = "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='utf-8'>" +
               "<style>" +
               "body { font-family: sans-serif; padding: 25px; color: #1e293b; }" +
               "h1 { color: #0f172a; text-align: center; font-size: 20px; margin-bottom: 5px; }" +
               ".header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }" +
               ".meta { font-size: 11px; color: #64748b; }" +
               "table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }" +
               "th { background: #0f172a; color: white; padding: 8px; text-align: right; }" +
               "td { border: 1px solid #cbd5e1; padding: 8px; }" +
               ".highlight { background: #f8fafc; font-weight: bold; }" +
               ".badge-paid { color: #059669; font-weight: bold; }" +
               ".badge-debt { color: #dc2626; font-weight: bold; }" +
               "</style></head><body>" +
               "<div class='header'>" +
               "<h1>🏢 مؤسسة الفتح (El Feth) - تقرير الموقف المالي الشامل</h1>" +
               "<div class='meta'>تاريخ الاستخراج: " + syncTimestamp + " | إشراف: السيد رؤوف (المدير العام)</div>" +
               "</div>";

    var totCol = (data.dzdCollections || []).reduce(function(acc, c){ return acc + (Number(c.amountDzd) || 0); }, 0);
    var totForexDzd = (data.forexTransfers || []).reduce(function(acc, f){ return acc + (Number(f.totalDzd) || 0); }, 0);
    var totEurBought = (data.forexTransfers || []).filter(function(f){ return f.currency === 'EUR'; }).reduce(function(a, f){ return a + (Number(f.amountForeign) || 0); }, 0);
    var totEurPaid = (data.supplierPayments || []).filter(function(p){ return p.paidCurrency === 'EUR'; }).reduce(function(a, p){ return a + (Number(p.amountPaid) || 0); }, 0);
    var totUsdInv = (data.supplierInvoices || []).reduce(function(a, i){ return a + (Number(i.totalAmountUsd) || 0); }, 0);
    var totUsdPay = (data.supplierPayments || []).reduce(function(a, p){ return a + (Number(p.totalPaidUsd) || 0); }, 0);

    html += "<h3>💰 ملخص الخزينة العامة</h3>" +
            "<table>" +
            "<tr><th>البيان المالي</th><th>القيمة الإجمالية</th><th>الملاحظات</th></tr>" +
            "<tr><td>رصيد كاش الدينار المتبقي</td><td class='highlight'>" + formatDzd(totCol - totForexDzd) + "</td><td>من إجمالي تحصيل " + formatDzd(totCol) + "</td></tr>" +
            "<tr><td>رصيد الأورو الجاري المتاح</td><td class='highlight'>€" + formatNumber(totEurBought - totEurPaid) + "</td><td>من إجمالي مشترى €" + formatNumber(totEurBought) + "</td></tr>" +
            "<tr><td>ديون المصانع المتبقية (USD)</td><td class='badge-debt'>$" + formatNumber(totUsdInv - totUsdPay) + "</td><td>المسدد $" + formatNumber(totUsdPay) + " من $" + formatNumber(totUsdInv) + "</td></tr>" +
            "</table>";

    html += "<h3>🏭 كشف حساب المصانع والشركات المستورد منها</h3>" +
            "<table>" +
            "<tr><th>المصنع</th><th>إجمالي الفواتير USD</th><th>إجمالي المسدد USD</th><th>الرصيد المتبقي</th></tr>";

    (data.suppliers || []).forEach(function(s) {
      var sInv = (data.supplierInvoices || []).filter(function(i){ return i.supplierId === s.id; }).reduce(function(a, i){ return a + (Number(i.totalAmountUsd) || 0); }, 0);
      var sPay = (data.supplierPayments || []).filter(function(p){ return p.supplierId === s.id; }).reduce(function(a, p){ return a + (Number(p.totalPaidUsd) || 0); }, 0);
      var bal = sInv - sPay;
      if (sInv > 0 || sPay > 0) {
        html += "<tr><td><b>" + s.name + "</b></td><td>$" + formatNumber(sInv) + "</td><td>$" + formatNumber(sPay) + "</td><td class='" + (bal <= 0 ? "badge-paid" : "badge-debt") + "'>" + (bal <= 0 ? "خالص ✅" : "$" + formatNumber(bal)) + "</td></tr>";
      }
    });
    html += "</table>";

    html += "<h3>🏬 موقف الفروع والمحلات</h3>" +
            "<table>" +
            "<tr><th>الفرع</th><th>المقبوض DZD</th><th>مستهلك الصرف DZD</th><th>رصيد الكاش</th><th>السلع USD</th><th>المسدد USD</th></tr>";
    (data.branches || []).forEach(function(b) {
      var bCol = (data.dzdCollections || []).filter(function(c){ return c.branchId === b.id; }).reduce(function(a, c){ return a + (Number(c.amountDzd) || 0); }, 0);
      var bForex = (data.forexTransfers || []).reduce(function(a, f){ return a + (Number((f.branchContributions && f.branchContributions[b.id]) || 0)); }, 0);
      var bInv = (data.supplierInvoices || []).reduce(function(a, i){ return a + (Number((i.branchSharesUsd && i.branchSharesUsd[b.id]) || 0)); }, 0);
      var bPay = (data.supplierPayments || []).reduce(function(a, p){ return a + (Number((p.branchAllocationsUsd && p.branchAllocationsUsd[b.id]) || 0)); }, 0);
      html += "<tr><td><b>" + b.name + "</b></td><td>" + formatDzd(bCol) + "</td><td>" + formatDzd(bForex) + "</td><td class='highlight'>" + formatDzd(bCol - bForex) + "</td><td>$" + formatNumber(bInv) + "</td><td>$" + formatNumber(bPay) + "</td></tr>";
    });
    html += "</table><div style='text-align:center; font-size:10px; color:#94a3b8; margin-top:30px;'>مؤسسة الفتح لاستيراد وتوزيع ملابس الأطفال • تم التوليد آلياً عبر بوت التيليغرام</div></body></html>";

    var blob = Utilities.newBlob(html, "text/html", "ElFeth_Report.html").getAs("application/pdf");
    blob.setName("تقرير_مؤسسة_الفتح_" + Utilities.formatDate(new Date(), "Africa/Algiers", "yyyy_MM_dd") + ".pdf");

    sendTelegramDocument(chatId, blob, "📄 <b>تقرير الموقف المالي الشامل لمؤسسة الفتح جاهز للتحميل والطباعة ✅</b>");

  } catch (err) {
    console.error("PDF error:", err);
    sendTelegramMessageToChat(chatId, "⚠️ حدث خطأ أثناء إنشاء تقرير PDF: " + err.message);
  }
}

// =========================================================================
// 🌐 دوال الاتصال مع Telegram API المتقدمة
// =========================================================================

function sendTelegramMessageWithInline(chatId, htmlText, inlineKeyboard) {
  var payload = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  };
  sendRawTelegramApi("sendMessage", payload);
}

function sendTelegramMessageToChat(chatId, htmlText) {
  var payload = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: "HTML"
  };
  sendRawTelegramApi("sendMessage", payload);
}

function answerCallbackQuery(callbackId) {
  sendRawTelegramApi("answerCallbackQuery", { callback_query_id: callbackId });
}

function sendTelegramDocument(chatId, blob, caption) {
  var url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendDocument";
  var payload = {
    chat_id: String(chatId),
    caption: caption || "",
    parse_mode: "HTML",
    document: blob
  };
  UrlFetchApp.fetch(url, {
    method: "post",
    payload: payload,
    muteHttpExceptions: true
  });
}

function sendRawTelegramApi(method, payload) {
  try {
    var url = "https://api.telegram.org/bot" + BOT_TOKEN + "/" + method;
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.error("Telegram API error (" + method + "):", e);
  }
}

// =========================================================================
// 🛠️ دوال التنسيق المالي واسترجاع البيانات
// =========================================================================

function getLedgerData() {
  var savedDataStr = PropertiesService.getScriptProperties().getProperty("LATEST_DATA");
  if (savedDataStr) {
    try {
      return JSON.parse(savedDataStr);
    } catch(e){}
  }
  return getDefaultDataStructure();
}

function formatDzd(val) {
  return formatNumber(val) + " دج";
}

function formatNumber(val) {
  var n = Number(val) || 0;
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getDefaultDataStructure() {
  return {
    branches: [
      { id: 'ogx', name: 'محل العلمة (OGX)', city: 'العلمة' },
      { id: 'batna', name: 'محل باتنة (Batna)', city: 'باتنة' },
      { id: 'blida', name: 'محل البليدة (Blida)', city: 'البليدة' },
      { id: 'oran', name: 'محل وهران (Oran)', city: 'وهران' }
    ],
    brokers: [
      { id: 'b_hich', name: 'هشام (HICH)' },
      { id: 'b_gizlan', name: 'غزلان (GIZLAN)' }
    ],
    suppliers: [
      { id: 's_damasquino', name: 'Damasquino', country: 'تركيا' },
      { id: 's_civil_demi', name: 'Civil Demi Season', country: 'تركيا' },
      { id: 's_civil_summer', name: 'Civil Summer', country: 'تركيا' },
      { id: 's_exina', name: 'Exina Demi Season', country: 'تركيا' },
      { id: 's_joi_kids', name: 'Joi Kids', country: 'تركيا' },
      { id: 's_cikoby', name: 'Cikoby', country: 'تركيا' },
      { id: 's_pengim', name: 'Pengim', country: 'تركيا' },
      { id: 's_mutlu_2', name: 'Mutlu 2', country: 'تركيا' },
      { id: 's_mutlu_pdf1', name: 'Mutlu Kids Wear PDF1', country: 'تركيا' },
      { id: 's_mutlu_pdf2', name: 'Mutlu Kids Wear PDF2', country: 'تركيا' },
      { id: 's_clementine', name: 'Clementine', country: 'تركيا' },
      { id: 's_elsima', name: 'Elsima', country: 'تركيا' },
      { id: 's_dalex', name: 'Dalex', country: 'تركيا' },
      { id: 's_soydan', name: 'Soydan', country: 'تركيا' },
      { id: 's_bbs', name: 'BBS', country: 'تركيا' },
      { id: 's_kocak', name: 'Kocak', country: 'تركيا' },
      { id: 's_mdm1', name: 'MDM (دفعة 1)', country: 'تركيا' },
      { id: 's_mdm2', name: 'MDM (دفعة 2)', country: 'تركيا' },
      { id: 's_himms', name: 'Dette HIMMS Oran', country: 'تركيا' }
    ],
    dzdCollections: [],
    forexTransfers: [],
    supplierInvoices: [],
    supplierPayments: [],
    settings: {
      usdToDzdReferenceRate: 250.9677,
      defaultEurToUsdRate: 1.085
    }
  };
}
