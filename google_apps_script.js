/**
 * Google Apps Script - Merchant Ledger Webhook Integration
 * 
 * تعليمات التثبيت:
 * 1. افتح ملف Google Sheets جديد.
 * 2. اضغط على Extensions (الإضافات) > Apps Script.
 * 3. احذف أي كود موجود وألصق هذا الكود كاملاً.
 * 4. اضغط على زر Deploy (نشر) > New deployment.
 * 5. اختر Select type: Web App.
 * 6. اضبط:
 *    - Description: Merchant Ledger Webhook
 *    - Execute as: Me (حسابك)
 *    - Who has access: Anyone (أي شخص)
 * 7. اضغط Deploy وانسخ رابط Web App URL وضعه في صفحة الإعدادات بالتطبيق.
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sheet: ملخص الفروع العام
    var sheetSummary = getOrCreateSheet(ss, "1_ملخص_الفروع_العام");
    formatSummarySheet(sheetSummary, payload);

    // 2. Sheet: تحويلات الوسطاء والصرف
    var sheetForex = getOrCreateSheet(ss, "2_تحويلات_الوسطاء");
    formatForexSheet(sheetForex, payload.forexTransfers, payload.branches);

    // 3. Sheet: فواتير الموردين
    var sheetSuppliers = getOrCreateSheet(ss, "3_فواتير_الموردين");
    formatSuppliersSheet(sheetSuppliers, payload.supplierInvoices, payload.suppliers, payload.branches);

    // 4. Sheet: استلامات الدينار
    var sheetCollections = getOrCreateSheet(ss, "4_استلامات_الدينار");
    formatCollectionsSheet(sheetCollections, payload.dzdCollections, payload.branches);

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data synced successfully!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  sheet.clear();
  sheet.setRightToLeft(true);
  return sheet;
}

function formatSummarySheet(sheet, payload) {
  var headers = ["الفرع / الشريك", "إجمالي الدينار المحصل (DZD)", "الدينار المستهلك للصرف (DZD)", "المسدد بالدولار ($)", "فواتير السلع ($)", "الرصيد الصافي ($)", "الرصيد المعادل بالدينار (DZD)"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");

  var refRate = payload.settings.usdToDzdReferenceRate || 250.9677;

  payload.branches.forEach(function(b) {
    // calculate stats
    var dzdCol = 0;
    (payload.dzdCollections || []).forEach(function(c) { if (c.branchId === b.id) dzdCol += Number(c.amountDzd) || 0; });
    
    var dzdUsed = 0;
    (payload.forexTransfers || []).forEach(function(f) {
      if (f.branchContributions && f.branchContributions[b.id]) dzdUsed += Number(f.branchContributions[b.id]) || 0;
    });

    var invUsd = 0;
    (payload.supplierInvoices || []).forEach(function(inv) {
      if (inv.branchSharesUsd && inv.branchSharesUsd[b.id]) invUsd += Number(inv.branchSharesUsd[b.id]) || 0;
    });

    var payUsd = 0;
    (payload.supplierPayments || []).forEach(function(p) {
      if (p.branchAllocationsUsd && p.branchAllocationsUsd[b.id]) payUsd += Number(p.branchAllocationsUsd[b.id]) || 0;
    });

    var netUsd = payUsd - invUsd;
    var netDzd = netUsd * refRate;

    sheet.appendRow([b.name, dzdCol, dzdUsed, payUsd, invUsd, netUsd, netDzd]);
  });

  sheet.autoResizeColumns(1, headers.length);
}

function formatForexSheet(sheet, transfers, branches) {
  var headers = ["التاريخ", "الوسيط", "المستلم", "العملة", "المبلغ بالعملة", "معامل الصرف (DZD)", "الإجمالي بالدينار", "الملاحظات"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");

  (transfers || []).forEach(function(f) {
    sheet.appendRow([f.date, f.brokerId, f.receiver, f.currency, f.amountForeign, f.exchangeRateDzd, f.totalDzd, f.notes || ""]);
  });

  sheet.autoResizeColumns(1, headers.length);
}

function formatSuppliersSheet(sheet, invoices, suppliers, branches) {
  var headers = ["المصنع / المورد", "حصة OGX ($)", "حصة باتنة ($)", "حصة البليدة ($)", "حصة وهران ($)", "المجموع الإجمالي ($)", "ملاحظات"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#3b0764").setFontColor("#ffffff").setFontWeight("bold");

  (invoices || []).forEach(function(inv) {
    var sup = suppliers.find(function(s) { return s.id === inv.supplierId; });
    var supName = sup ? sup.name : (inv.supplierId || "");
    var sh = inv.branchSharesUsd || {};
    sheet.appendRow([supName, sh.ogx || 0, sh.batna || 0, sh.blida || 0, sh.oran || 0, inv.totalAmountUsd, inv.notes || ""]);
  });

  sheet.autoResizeColumns(1, headers.length);
}

function formatCollectionsSheet(sheet, collections, branches) {
  var headers = ["التاريخ", "الفرع", "المبلغ بالدينار (DZD)", "طريقة الاستلام", "ملاحظات"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setBackground("#064e3b").setFontColor("#ffffff").setFontWeight("bold");

  (collections || []).forEach(function(c) {
    var br = branches.find(function(b) { return b.id === c.branchId; });
    var brName = br ? br.name : c.branchId;
    sheet.appendRow([c.date, brName, c.amountDzd, c.paymentMethod, c.notes || ""]);
  });

  sheet.autoResizeColumns(1, headers.length);
}
