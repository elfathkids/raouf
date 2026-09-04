/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود الربط الشامل والمزامنة الفورية مع Google Sheets
 * المطور: Aminebens_off
 * المدير العام: raouf
 * =========================================================================
 * 
 * 📖 تعليمات التركيب والتفعيل (خطوة بخطوة):
 * 1. افتح ملف Google Sheets جديد وفارغ في حسابك على Google Drive.
 * 2. من القائمة العلوية اضغط على: Extensions (الإضافات) > Apps Script.
 * 3. احذف أي كود مكتوب في المحرر والصق هذا الكود كاملاً بدلاً منه.
 * 4. في أعلى اليمين اضغط على زر Deploy (نشر) > New deployment (نشر جديد).
 * 5. اضغط على أيقونة الترس ⚙️ واختر: Web app (تطبيق ويب).
 * 6. اضبط الإعدادات كالتالي:
 *    - Description: El Feth Ledger Webhook
 *    - Execute as: Me (حسابك)
 *    - Who has access: Anyone (أي شخص)  <-- هام جداً!
 * 7. اضغط Deploy وامنح الأذونات (Authorize access).
 * 8. انسخ رابط Web app URL وضعه في إعدادات التطبيق (تبويب الإعدادات والربط).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var syncTimestamp = Utilities.formatDate(new Date(), "Africa/Algiers", "yyyy-MM-dd HH:mm:ss");

    // 1. ورقة: لوحة التحكم والخزينة العامة
    var sheetDashboard = getOrCreateSheet(ss, "📊 لوحة الخزينة والأرصدة", 1);
    buildDashboardSheet(sheetDashboard, payload, syncTimestamp);

    // 2. ورقة: سجل تحصيل الدينار
    var sheetCollections = getOrCreateSheet(ss, "💵 تحصيلات الدينار DZD", 2);
    buildCollectionsSheet(sheetCollections, payload.dzdCollections, payload.branches);

    // 3. ورقة: سجل صرف العملات
    var sheetForex = getOrCreateSheet(ss, "💱 صرف العملات Forex", 3);
    buildForexSheet(sheetForex, payload.forexTransfers, payload.branches, payload.brokers);

    // 4. ورقة: فواتير المصانع التركية
    var sheetInvoices = getOrCreateSheet(ss, "📦 فواتير المصانع USD", 4);
    buildInvoicesSheet(sheetInvoices, payload.supplierInvoices, payload.suppliers, payload.branches);

    // 5. ورقة: تسديدات الموردين
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

// دالة جلب أو إنشاء الورقة مع ضبط الاتجاه والتنظيف
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

// 1. بناء لوحة الخزينة العامة
function buildDashboardSheet(sheet, payload, syncTimestamp) {
  sheet.setFrozenRows(3);

  // رأس اللوحة
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

  // رؤوس الأعمدة
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
  var branches = payload.branches || [];

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

    // تنسيق الأرقام والعملات
    sheet.getRange(4, 2, rows.length, 3).setNumberFormat("#,##0 \"د.ج\"");
    sheet.getRange(4, 5, rows.length, 3).setNumberFormat("\"$\"#,##0.00");
    sheet.getRange(4, 8, rows.length, 1).setNumberFormat("#,##0 \"د.ج\"");

    // صف المجموع الكلي
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

// 2. بناء ورقة تحصيلات الدينار
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

    // صف المجموع
    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("إجمالي تحصيلات الدينار").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setFormula("=SUM(D2:D" + (totIdx - 1) + ")");
    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#ecfdf5").setFontWeight("bold");
    sheet.getRange(totIdx, 4).setNumberFormat("#,##0 \"د.ج\"");
  }

  sheet.autoResizeColumns(1, headers.length);
}

// 3. بناء ورقة صرف العملات
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

    // صف المجموع
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

// 4. بناء ورقة فواتير المصانع
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

    // صف المجموع
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

// 5. بناء ورقة تسديدات المصانع
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

    // صف المجموع
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
