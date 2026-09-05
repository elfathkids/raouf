/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود مزامنة Google Sheets المستقل
 * المطور: Aminebens_off
 * المدير العام: raouf
 * 
 * 📌 الوظيفة: استقبال بيانات المنظومة وتحديث وتنسيق جداول Google Sheets تلقائياً
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);

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
