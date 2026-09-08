/**
 * =========================================================================
 * مؤسسة الفتح (El Feth) - كود مزامنة Google Sheets المستقل
 * المطور: Aminebens_off
 * المدير العام: raouf
 * 
 * 📌 الوظيفة: استقبال بيانات المنظومة وتحديث وتنسيق جداول Google Sheets تلقائياً
 * مع فصل تام بين أعمدة ومجاميع الأورو (€) والدولار ($) لمنع أي جمع مشترك
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

    // 🌟 الشيت الأول: مصفوفة فواتير المصانع وتصفية حسابات الفروع (المطابقة لصورة الإكسل 100%)
    var sheetMatrix = getOrCreateSheet(ss, "📊 مصفوفة تصفية الحسابات (Matrix)", 1);
    buildMatrixSettlementSheet(sheetMatrix, payload);

    var sheetDashboard = getOrCreateSheet(ss, "🏢 لوحة الخزينة والأرصدة", 2);
    buildDashboardSheet(sheetDashboard, payload, syncTimestamp);

    var sheetCollections = getOrCreateSheet(ss, "💵 تحصيلات الدينار DZD", 3);
    buildCollectionsSheet(sheetCollections, payload.dzdCollections, payload.branches);

    var sheetForex = getOrCreateSheet(ss, "💱 صرف العملات Forex", 4);
    buildForexSheet(sheetForex, payload.forexTransfers, payload.branches, payload.brokers);

    var sheetInvoices = getOrCreateSheet(ss, "📦 فواتير المصانع USD", 5);
    buildInvoicesSheet(sheetInvoices, payload.supplierInvoices, payload.suppliers, payload.branches);

    var sheetPayments = getOrCreateSheet(ss, "💳 تسديدات المصانع Payments", 6);
    buildPaymentsSheet(sheetPayments, payload.supplierPayments, payload.suppliers, payload.branches);

    var sheetBrokerPayments = getOrCreateSheet(ss, "🤝 تسديدات ديون الصرافين DZD", 7);
    buildBrokerPaymentsSheet(sheetBrokerPayments, payload.brokerPayments, payload.brokers, payload.branches);

    SpreadsheetApp.flush();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "تم تحديث كافة جداول Google Sheets بنجاح مع فصل أعمدة الأورو والدولار!",
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


// 🌟 1. مصفوفة فواتير المصانع وتصفية حسابات الفروع (مطابقة لصورة الإكسل الأصلية 100%)
// 🌟 1. مصفوفة تصفية الحسابات الشاملة (مطابقة 100% للملف الأصلي للمدير العام: جدول الصرف بالأعلى + مصفوفة المصانع بالأسفل)
function buildMatrixSettlementSheet(sheet, data) {
  sheet.clear();
  sheet.setRightToLeft(false); // Left-to-right exactly as in original Excel

  var branches = data.branches || [
    { id: 'ogx', name: 'OGX' },
    { id: 'batna', name: 'BATNA' },
    { id: 'blida', name: 'BLIDA' },
    { id: 'oran', name: 'ORAN' }
  ];

  var forex = data.forexTransfers || [];
  var suppliers = data.suppliers || [];
  var invoices = data.supplierInvoices || [];
  var payments = data.supplierPayments || [];
  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677161;

  // ==========================================
  // TABLE 1: TABLEAU DES DEVISES & CONTRIBUTIONS (جدول الصرف ومساهمات الفروع)
  // ==========================================
  var fxHeaders = ["date", "coefficient", "equvalanat dzd", "PERSON DE TRNQS", "recived", "euro", "USD", "extra", "ogx", "batna", "blida", "oran", "Total DZD", "Colonne 4", "Rest A payer"];
  sheet.getRange(5, 1, 1, fxHeaders.length).setValues([fxHeaders])
    .setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center");
  sheet.setRowHeight(5, 26);

  var fxRows = [];
  var sumEqDzd = 0, sumEur = 0, sumUsd = 0;
  var sumOgxFx = 0, sumBatnaFx = 0, sumBlidaFx = 0, sumOranFx = 0, sumTotCont = 0, sumRestFx = 0;

  forex.forEach(function(f) {
    var amt = Number(f.amountForeign) || 0;
    var rate = Number(f.exchangeRateDzd) || 0;
    var eqDzd = Number(f.totalDzd) || (amt * rate);
    var isEur = (f.currency || 'EUR').toUpperCase() === 'EUR';
    var isUsd = (f.currency || 'EUR').toUpperCase() === 'USD';
    var eurVal = isEur ? amt : "";
    var usdVal = isUsd ? amt : "";
    
    var contrib = f.branchContributions || {};
    var ogxDzd = Number(contrib.ogx) || 0;
    var batnaDzd = Number(contrib.batna) || 0;
    var blidaDzd = Number(contrib.blida) || 0;
    var oranDzd = Number(contrib.oran) || 0;
    var totCont = ogxDzd + batnaDzd + blidaDzd + oranDzd;
    var rest = Number(f.restDzd) || Math.max(0, eqDzd - totCont);

    sumEqDzd += eqDzd;
    if (isEur) sumEur += amt;
    if (isUsd) sumUsd += amt;
    sumOgxFx += ogxDzd;
    sumBatnaFx += batnaDzd;
    sumBlidaFx += blidaDzd;
    sumOranFx += oranDzd;
    sumTotCont += totCont;
    sumRestFx += rest;

    var brokerName = f.brokerId || "";
    if (data.brokers) {
      var foundB = data.brokers.find(function(b){ return b.id === f.brokerId; });
      if (foundB) brokerName = foundB.name;
    }

    fxRows.push([
      f.date || "",
      rate,
      eqDzd,
      brokerName,
      f.receiver || "",
      eurVal,
      usdVal,
      "",
      ogxDzd > 0 ? ogxDzd : "",
      batnaDzd > 0 ? batnaDzd : "",
      blidaDzd > 0 ? blidaDzd : "",
      oranDzd > 0 ? oranDzd : "",
      totCont,
      eqDzd,
      rest > 0 ? rest : 0
    ]);
  });

  if (fxRows.length > 0) {
    sheet.getRange(6, 1, fxRows.length, fxHeaders.length).setValues(fxRows).setFontSize(9.5).setVerticalAlignment("middle");
    sheet.getRange(6, 3, fxRows.length, 1).setNumberFormat("#,##0");
    sheet.getRange(6, 6, fxRows.length, 2).setNumberFormat("#,##0.00");
    sheet.getRange(6, 9, fxRows.length, 7).setNumberFormat("#,##0");
  }

  var fxTotalRowIdx = 6 + Math.max(1, fxRows.length);
  var fxTotals = [
    "TOTAL", "", sumEqDzd, "", "", sumEur, sumUsd, "",
    sumOgxFx, sumBatnaFx, sumBlidaFx, sumOranFx, sumTotCont, sumEqDzd, sumRestFx
  ];
  sheet.getRange(fxTotalRowIdx, 1, 1, fxHeaders.length).setValues([fxTotals])
    .setFontWeight("bold").setFontSize(10).setBackground("#e2e8f0");
  sheet.getRange(fxTotalRowIdx, 3).setNumberFormat("#,##0");
  sheet.getRange(fxTotalRowIdx, 6, 1, 2).setNumberFormat("#,##0.00");
  sheet.getRange(fxTotalRowIdx, 9, 1, 7).setNumberFormat("#,##0");

  // ==========================================
  // TABLE 2: MATRIX OF INVOICES & SETTLEMENT (مصفوفة فواتير المصانع وتصفية الحسابات)
  // ==========================================
  var matrixStartRow = fxTotalRowIdx + 4;
  
  // Section Title
  sheet.getRange(matrixStartRow - 1, 1).setValue("📊 مصفوفة فواتير المصانع وتصفية حسابات الفروع (USD / DZD)")
    .setFontWeight("black").setFontSize(12).setFontColor("#0f172a");

  var matHeaders = ["Fournisseurs / المصنع", "OGX", "BATNA", "BLIDA", "ORAN", "Total USD"];
  sheet.getRange(matrixStartRow, 1, 1, matHeaders.length).setValues([matHeaders])
    .setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(matrixStartRow, 28);

  // Group invoices by supplier
  var supplierMap = {};
  suppliers.forEach(function(s) {
    supplierMap[s.id] = {
      name: s.name,
      ogx: 0,
      batna: 0,
      blida: 0,
      oran: 0,
      total: 0,
      hasData: false
    };
  });

  invoices.forEach(function(inv) {
    var sId = inv.supplierId;
    if (!supplierMap[sId]) {
      var found = suppliers.find(function(s){ return s.name.toLowerCase() === (inv.supplierId||'').toLowerCase(); });
      if (found) sId = found.id;
      else {
        supplierMap[sId] = { name: inv.supplierId || "مورد", ogx: 0, batna: 0, blida: 0, oran: 0, total: 0, hasData: true };
      }
    }
    var sm = supplierMap[sId];
    var shares = inv.branchSharesUsd || {};
    var ogxVal = Number(shares.ogx) || 0;
    var batnaVal = Number(shares.batna) || 0;
    var blidaVal = Number(shares.blida) || 0;
    var oranVal = Number(shares.oran) || 0;
    var tot = Number(inv.totalAmountUsd) || (ogxVal + batnaVal + blidaVal + oranVal);

    sm.ogx += ogxVal;
    sm.batna += batnaVal;
    sm.blida += blidaVal;
    sm.oran += oranVal;
    sm.total += tot;
    if (tot > 0) sm.hasData = true;
  });

  var matRows = [];
  var sumOgxInv = 0, sumBatnaInv = 0, sumBlidaInv = 0, sumOranInv = 0, sumTotalInv = 0;

  Object.values(supplierMap).forEach(function(sm) {
    sumOgxInv += sm.ogx;
    sumBatnaInv += sm.batna;
    sumBlidaInv += sm.blida;
    sumOranInv += sm.oran;
    sumTotalInv += sm.total;

    // Invoices displayed as negative numbers matching original Excel
    matRows.push([
      sm.name,
      sm.ogx > 0 ? -sm.ogx : "",
      sm.batna > 0 ? -sm.batna : "",
      sm.blida > 0 ? -sm.blida : "",
      sm.oran > 0 ? -sm.oran : "",
      sm.total > 0 ? -sm.total : ""
    ]);
  });

  if (matRows.length > 0) {
    var dataRange = sheet.getRange(matrixStartRow + 1, 1, matRows.length, matHeaders.length);
    dataRange.setValues(matRows);
    dataRange.setFontSize(10);
    sheet.getRange(matrixStartRow + 1, 1, matRows.length, 1).setFontWeight("bold").setBackground("#f8fafc");
    sheet.getRange(matrixStartRow + 1, 2, matRows.length, 5).setNumberFormat("#,##0.00;(#,##0.00)");
  }

  var curMatRow = matrixStartRow + 1 + matRows.length;

  // Row 1: Total Fawatir (فواتير السلع)
  var totInvRow = [
    "Total Fawatir (فواتير السلع)",
    -sumOgxInv,
    -sumBatnaInv,
    -sumBlidaInv,
    -sumOranInv,
    -sumTotalInv
  ];
  sheet.getRange(curMatRow, 1, 1, matHeaders.length).setValues([totInvRow])
    .setFontWeight("bold").setFontSize(10).setBackground("#e2e8f0");
  sheet.getRange(curMatRow, 2, 1, 5).setNumberFormat("#,##0.00;(#,##0.00)");
  sheet.setRowHeight(curMatRow, 28);
  curMatRow += 2; // Gap

  // Row 2: total paiment (GREEN) - Computed as (Branch DZD Contributed / refRate) + direct payments!
  var ogxPayUsd = (sumOgxFx / refRate);
  var batnaPayUsd = (sumBatnaFx / refRate);
  var blidaPayUsd = (sumBlidaFx / refRate);
  var oranPayUsd = (sumOranFx / refRate);
  
  // Add any direct USD payments if exist
  payments.forEach(function(p) {
    var alloc = p.branchAllocationsUsd || {};
    ogxPayUsd += Number(alloc.ogx) || 0;
    batnaPayUsd += Number(alloc.batna) || 0;
    blidaPayUsd += Number(alloc.blida) || 0;
    oranPayUsd += Number(alloc.oran) || 0;
  });
  var totalPayUsd = ogxPayUsd + batnaPayUsd + blidaPayUsd + oranPayUsd;

  var greenRow = [
    "total paiment",
    ogxPayUsd,
    batnaPayUsd,
    blidaPayUsd,
    oranPayUsd,
    totalPayUsd
  ];
  var greenRange = sheet.getRange(curMatRow, 1, 1, matHeaders.length);
  greenRange.setValues([greenRow]).setFontWeight("black").setFontSize(11).setBackground("#22c55e").setFontColor("#000000").setHorizontalAlignment("center");
  sheet.getRange(curMatRow, 2, 1, 5).setNumberFormat("#,##0.00");
  sheet.setRowHeight(curMatRow, 30);
  curMatRow++;

  // Row 3: Net Balance USD (ORANGE / RED)
  var netOgxUsd = ogxPayUsd - sumOgxInv;
  var netBatnaUsd = batnaPayUsd - sumBatnaInv;
  var netBlidaUsd = blidaPayUsd - sumBlidaInv;
  var netOranUsd = oranPayUsd - sumOranInv;
  var netTotalUsd = totalPayUsd - sumTotalInv;

  var orangeRow = [
    "Net Balance USD",
    netOgxUsd,
    netBatnaUsd,
    netBlidaUsd,
    netOranUsd,
    netTotalUsd
  ];
  var orangeRange = sheet.getRange(curMatRow, 1, 1, matHeaders.length);
  orangeRange.setValues([orangeRow]).setFontWeight("black").setFontSize(11).setBackground("#f97316").setFontColor("#000000").setHorizontalAlignment("center");
  sheet.getRange(curMatRow, 6).setBackground("#ef4444").setFontColor("#ffffff");
  sheet.getRange(curMatRow, 2, 1, 5).setNumberFormat("#,##0.00;(#,##0.00)");
  sheet.setRowHeight(curMatRow, 30);
  curMatRow++;

  // Row 4: Reference Rate
  var rateRow = [
    refRate.toFixed(7),
    refRate,
    refRate,
    refRate,
    refRate,
    ""
  ];
  var rateRange = sheet.getRange(curMatRow, 1, 1, matHeaders.length);
  rateRange.setValues([rateRow]).setFontWeight("bold").setFontSize(10).setBackground("#f8fafc").setHorizontalAlignment("center");
  sheet.getRange(curMatRow, 2, 1, 4).setNumberFormat("0.0000000");
  curMatRow++;

  // Row 5: Net DZD Settlement
  var netOgxDzd = netOgxUsd * refRate;
  var netBatnaDzd = netBatnaUsd * refRate;
  var netBlidaDzd = netBlidaUsd * refRate;
  var netOranDzd = netOranUsd * refRate;
  var netTotalDzd = netTotalUsd * refRate;

  var dzdRow = [
    "المعادل الصافي بالدينار DZD",
    netOgxDzd,
    netBatnaDzd,
    netBlidaDzd,
    netOranDzd,
    netTotalDzd
  ];
  var dzdRange = sheet.getRange(curMatRow, 1, 1, matHeaders.length);
  dzdRange.setValues([dzdRow]).setFontWeight("black").setFontSize(11).setBackground("#f1f5f9").setHorizontalAlignment("center");
  sheet.getRange(curMatRow, 2, 1, 5).setNumberFormat("#,##0 د.ج");
  sheet.setRowHeight(curMatRow, 32);

  // Styling & Auto sizing
  sheet.autoResizeColumns(1, fxHeaders.length);
  sheet.setColumnWidth(1, 230);
}


function buildDashboardSheet(sheet, data, syncTimestamp) {
  var titleRange = sheet.getRange("A1:L1");
  titleRange.merge().setValue("🏢 مؤسسة الفتح (El Feth) - لوحة التحكم المالية والخزينة العامة");
  titleRange.setBackground("#064e3b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(14).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 40);

  var subRange = sheet.getRange("A2:L2");
  subRange.merge().setValue("🕒 تاريخ و وقت آخر مزامنة: " + syncTimestamp + " | إعداد: المدير العام (raouf) & Aminebens_off");
  subRange.setBackground("#ecfdf5").setFontColor("#065f46").setFontSize(10).setHorizontalAlignment("center");

  var cardHeaders = [[
    "💵 تحصيلات الدينار DZD", "💱 مصروف الدينار DZD", "🔹 رصيد الدينار المتبقي",
    "💶 مشتريات الأورو EUR", "💶 مسدد الأورو EUR", "🔹 رصيد الأورو المتاح",
    "💵 مشتريات الدولار USD", "💵 مسدد الدولار USD", "🔹 رصيد الدولار المتاح",
    "📦 فواتير السلع USD", "💳 المسدد الإجمالي USD", "🔴 ديون المصانع USD"
  ]];
  sheet.getRange("A4:L4").setValues(cardHeaders).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff").setHorizontalAlignment("center").setFontSize(10);
  
  var totCol = (data.dzdCollections || []).reduce(function(acc, c){ return acc + (Number(c.amountDzd) || 0); }, 0);
  var totForexDzdPaid = (data.forexTransfers || []).reduce(function(acc, f){ return acc + (Number(f.dzdPaid !== undefined && f.dzdPaid !== null ? f.dzdPaid : 0) || 0); }, 0);
  var totBrokerSettlementsDzd = (data.brokerPayments || []).reduce(function(acc, bp){ return acc + (Number(bp.amountDzd) || 0); }, 0);
  var totDzdUsed = totForexDzdPaid + totBrokerSettlementsDzd;
  var restCashDzd = totCol - totDzdUsed;

  var totEurBought = (data.forexTransfers || []).filter(function(f){ return (f.currency || 'EUR').toUpperCase() === 'EUR'; }).reduce(function(a, f){ return a + (Number(f.amountForeign) || 0); }, 0);
  var totEurPaid = (data.supplierPayments || []).filter(function(p){ return (p.paidCurrency || 'USD').toUpperCase() === 'EUR'; }).reduce(function(a, p){ return a + (Number(p.amountPaid) || 0); }, 0);
  var restEur = totEurBought - totEurPaid;

  var totUsdBought = (data.forexTransfers || []).filter(function(f){ return (f.currency || 'EUR').toUpperCase() === 'USD'; }).reduce(function(a, f){ return a + (Number(f.amountForeign) || 0); }, 0);
  var totUsdPaidDirect = (data.supplierPayments || []).filter(function(p){ return (p.paidCurrency || 'USD').toUpperCase() === 'USD'; }).reduce(function(a, p){ return a + (Number(p.amountPaid !== undefined ? p.amountPaid : p.totalPaidUsd) || 0); }, 0);
  var restUsd = totUsdBought - totUsdPaidDirect;

  var totInvUsd = (data.supplierInvoices || []).reduce(function(acc, i){ return acc + (Number(i.totalAmountUsd) || 0); }, 0);
  var totPayUsd = (data.supplierPayments || []).reduce(function(acc, p){ return acc + (Number(p.totalPaidUsd) || 0); }, 0);
  var remainingDebtUsd = totInvUsd - totPayUsd;

  sheet.getRange("A5").setValue(totCol).setNumberFormat("#,##0 د.ج");
  sheet.getRange("B5").setValue(totForexDzd).setNumberFormat("#,##0 د.ج");
  sheet.getRange("C5").setValue(restCashDzd).setNumberFormat("#,##0 د.ج");

  sheet.getRange("D5").setValue(totEurBought).setNumberFormat("€#,##0.00");
  sheet.getRange("E5").setValue(totEurPaid).setNumberFormat("€#,##0.00");
  sheet.getRange("F5").setValue(restEur).setNumberFormat("€#,##0.00");

  sheet.getRange("G5").setValue(totUsdBought).setNumberFormat("$#,##0.00");
  sheet.getRange("H5").setValue(totUsdPaidDirect).setNumberFormat("$#,##0.00");
  sheet.getRange("I5").setValue(restUsd).setNumberFormat("$#,##0.00");

  sheet.getRange("J5").setValue(totInvUsd).setNumberFormat("$#,##0.00");
  sheet.getRange("K5").setValue(totPayUsd).setNumberFormat("$#,##0.00");
  sheet.getRange("L5").setValue(remainingDebtUsd).setNumberFormat("$#,##0.00");

  sheet.getRange("A5:L5").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center").setBackground("#f8fafc");
  sheet.getRange("C5").setFontColor("#059669");
  sheet.getRange("F5").setFontColor("#0891b2");
  sheet.getRange("I5").setFontColor("#7c3aed");
  sheet.getRange("L5").setFontColor("#dc2626");

  var brHeader = sheet.getRange("A7:I7");
  brHeader.merge().setValue("🏬 الموقف المالي التفصيلي للفروع والمحلات (DZD & USD)");
  brHeader.setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");

  var brSub = ["الفرع / المحل", "المقبوض بالدينار", "المستهلك للصرف", "رصيد الدينار المتبقي", "فواتير السلع USD", "المسدد للمصانع USD", "فارق السلع USD", "المعادل الصافي DZD", "ملاحظات"];
  sheet.getRange(8, 1, 1, brSub.length).setValues([brSub]).setBackground("#334155").setFontColor("#ffffff").setFontWeight("bold").setFontSize(10);

  var refRate = (data.settings && data.settings.usdToDzdReferenceRate) ? Number(data.settings.usdToDzdReferenceRate) : 250.9677;
  var branchRows = [];
  (data.branches || []).forEach(function(b) {
    var bCol = (data.dzdCollections || []).filter(function(c){ return c.branchId === b.id; }).reduce(function(a, c){ return a + (Number(c.amountDzd) || 0); }, 0);
    var bForex = (data.forexTransfers || []).reduce(function(a, f){ return a + (Number((f.branchContributions && f.branchContributions[b.id]) || 0)); }, 0);
    var bRest = bCol - bForex;
    var bInv = (data.supplierInvoices || []).reduce(function(a, inv){ return a + (Number((inv.branchSharesUsd && inv.branchSharesUsd[b.id]) || 0)); }, 0);
    var bPay = (data.supplierPayments || []).reduce(function(a, pay){ return a + (Number((pay.branchAllocationsUsd && pay.branchAllocationsUsd[b.id]) || 0)); }, 0);
    var bDiffUsd = bInv - bPay;
    var bNetDzd = (bPay - bInv) * refRate;

    branchRows.push([b.name, bCol, bForex, bRest, bInv, bPay, bDiffUsd, bNetDzd, (bRest >= 0 ? "فائض كاش" : "عجز كاش")]);
  });

  if (branchRows.length > 0) {
    var brRange = sheet.getRange(9, 1, branchRows.length, brSub.length);
    brRange.setValues(branchRows);
    brRange.setFontSize(10);
    sheet.getRange(9, 2, branchRows.length, 3).setNumberFormat("#,##0 د.ج");
    sheet.getRange(9, 5, branchRows.length, 3).setNumberFormat("$#,##0.00");
    sheet.getRange(9, 8, branchRows.length, 1).setNumberFormat("#,##0 د.ج");
  }

  sheet.autoResizeColumns(1, 12);
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
    sheet.getRange(totIdx, 4).setNumberFormat("#,##0 د.ج");
  }

  sheet.autoResizeColumns(1, headers.length);
}

// 🌟 صرف العملات - عمود منفصل للأورو وعمود منفصل للدولار (مستحيل يتخلطو!)
function buildForexSheet(sheet, forex, branches, brokers) {
  var headers = [
    "التاريخ", "الوقت", "الوسيط (Broker)", "المستلم في تركيا",
    "💶 المبلغ بالأورو (EUR)", "💵 المبلغ بالدولار (USD)",
    "سعر الصرف (DZD)", "الإجمالي بالدينار DZD",
    "💵 المدفوع كاش DZD", "⏳ دين الوسيط DZD", "حالة الدفع للوسيط",
    "مساهمة OGX", "مساهمة باتنة", "مساهمة البليدة", "مساهمة وهران", "المتبقي غير الموزع", "ملاحظات"
  ];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  var sumEur = 0;
  var sumUsd = 0;
  var sumTotalDzd = 0;
  var sumPaidDzd = 0;
  var sumDebtDzd = 0;
  var sumOgx = 0, sumBatna = 0, sumBlida = 0, sumOran = 0, sumRest = 0;

  (forex || []).forEach(function(f) {
    var brk = (brokers || []).find(function(b) { return b.id === f.brokerId || b.name === f.brokerId; });
    var brkName = brk ? brk.name : (f.brokerId || "");
    var timeStr = f.time || (f.createdAt ? f.createdAt.substring(11, 19) : "--:--");
    var contrib = f.branchContributions || {};
    var cur = (f.currency || "EUR").toUpperCase();
    var amt = Number(f.amountForeign) || 0;
    var rate = Number(f.exchangeRateDzd) || 0;
    var totDzd = Number(f.totalDzd) || (amt * rate);
    var paidDzd = (f.dzdPaid !== undefined && f.dzdPaid !== null && f.dzdPaid !== "") ? Number(f.dzdPaid) : totDzd;
    var debtDzd = Math.max(0, totDzd - paidDzd);

    var payStatus = debtDzd === 0 ? "خالص ✅" : (paidDzd === 0 ? "كريدي كامل 🔴" : "مسدد جزئياً ⏳");

    var amtEur = cur === "EUR" ? amt : 0;
    var amtUsd = cur === "USD" ? amt : 0;

    var ogxVal = Number(contrib.ogx) || 0;
    var batnaVal = Number(contrib.batna) || 0;
    var blidaVal = Number(contrib.blida) || 0;
    var oranVal = Number(contrib.oran) || 0;
    var restVal = Number(f.restDzd) || 0;

    sumEur += amtEur;
    sumUsd += amtUsd;
    sumTotalDzd += totDzd;
    sumPaidDzd += paidDzd;
    sumDebtDzd += debtDzd;
    sumOgx += ogxVal;
    sumBatna += batnaVal;
    sumBlida += blidaVal;
    sumOran += oranVal;
    sumRest += restVal;

    rows.push([
      f.date || "",
      timeStr,
      brkName,
      f.receiver || "",
      amtEur,
      amtUsd,
      rate,
      totDzd,
      paidDzd,
      debtDzd,
      payStatus,
      ogxVal,
      batnaVal,
      blidaVal,
      oranVal,
      restVal,
      f.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 5, rows.length, 1).setNumberFormat("€#,##0.00");
    sheet.getRange(2, 6, rows.length, 1).setNumberFormat("$#,##0.00");
    sheet.getRange(2, 7, rows.length, 1).setNumberFormat("#,##0.00 د.ج");
    sheet.getRange(2, 8, rows.length, 3).setNumberFormat("#,##0 د.ج");
    sheet.getRange(2, 12, rows.length, 5).setNumberFormat("#,##0 د.ج");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 4).merge().setValue("المجموع الكلي").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(totIdx, 5).setValue(sumEur).setNumberFormat("€#,##0.00");
    sheet.getRange(totIdx, 6).setValue(sumUsd).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 7).setValue("");
    sheet.getRange(totIdx, 8).setValue(sumTotalDzd).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 9).setValue(sumPaidDzd).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 10).setValue(sumDebtDzd).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 11).setValue("");
    sheet.getRange(totIdx, 12).setValue(sumOgx).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 13).setValue(sumBatna).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 14).setValue(sumBlida).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 15).setValue(sumOran).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 16).setValue(sumRest).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 17).setValue("");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#eff6ff").setFontWeight("bold");
  }

  sheet.autoResizeColumns(1, headers.length);
}

// 🌟 سجل تسديدات ودفعات ديون الصرافين (DZD)
function buildBrokerPaymentsSheet(sheet, brokerPayments, brokers, branches) {
  var headers = [
    "التاريخ", "الوقت", "الصراف / الوسيط", "المبلغ المسدد (DZD)", "المصدر / الفرع", "طريقة السداد", "البيان والملاحظات"
  ];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#d97706").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  var sumPaid = 0;

  (brokerPayments || []).forEach(function(bp) {
    var brk = (brokers || []).find(function(b) { return b.id === bp.brokerId || b.name === bp.brokerId; });
    var brkName = brk ? brk.name : (bp.brokerId || "");
    var branchObj = (branches || []).find(function(b) { return b.id === bp.branchId; });
    var branchName = bp.branchId === "general" ? "الخزينة العامة المركزية" : (branchObj ? branchObj.name : (bp.branchId || ""));
    var timeStr = bp.time || (bp.createdAt ? bp.createdAt.substring(11, 19) : "--:--");
    var amt = Number(bp.amountDzd) || 0;
    sumPaid += amt;

    rows.push([
      bp.date || "",
      timeStr,
      brkName,
      amt,
      branchName,
      bp.paymentMethod === "cash" ? "نقداً (Cash)" : "تحويل",
      bp.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat('#,##0 "د.ج"').setFontWeight("bold");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("إجمالي تسديدات ديون الصرافين").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(totIdx, 4).setValue(sumPaid).setNumberFormat("#,##0 د.ج");
    sheet.getRange(totIdx, 5, 1, 3).setValue("");
    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#fef3c7").setFontWeight("bold");
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
  var sumInv = 0, sumOgx = 0, sumBatna = 0, sumBlida = 0, sumOran = 0;

  (invoices || []).forEach(function(inv) {
    var sup = (suppliers || []).find(function(s) { return s.id === inv.supplierId; });
    var supName = sup ? sup.name : (inv.supplierId || "");
    var timeStr = inv.time || (inv.createdAt ? inv.createdAt.substring(11, 19) : "--:--");
    var shares = inv.branchSharesUsd || {};
    var amt = Number(inv.totalAmountUsd) || 0;
    var ogxVal = Number(shares.ogx) || 0;
    var batnaVal = Number(shares.batna) || 0;
    var blidaVal = Number(shares.blida) || 0;
    var oranVal = Number(shares.oran) || 0;

    sumInv += amt;
    sumOgx += ogxVal;
    sumBatna += batnaVal;
    sumBlida += blidaVal;
    sumOran += oranVal;

    rows.push([
      inv.date || "",
      timeStr,
      supName,
      inv.invoiceNumber || "",
      inv.invoiceCurrency || "USD",
      amt,
      ogxVal,
      batnaVal,
      blidaVal,
      oranVal,
      inv.recordedBy || "المدير العام (raouf)",
      inv.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 6, rows.length, 5).setNumberFormat("$#,##0.00");

    var totIdx = 2 + rows.length;
    sheet.getRange(totIdx, 1, 1, 5).merge().setValue("المجموع الكلي لفواتير المصانع (USD)").setFontWeight("bold");
    sheet.getRange(totIdx, 6).setValue(sumInv).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 7).setValue(sumOgx).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 8).setValue(sumBatna).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 9).setValue(sumBlida).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 10).setValue(sumOran).setNumberFormat("$#,##0.00");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#fdf2f8").setFontWeight("bold");
  }

  sheet.autoResizeColumns(1, headers.length);
}

// 🌟 تسديدات المصانع - عمود منفصل للأورو، الدولار، والتخفيض (Remise)
function buildPaymentsSheet(sheet, payments, suppliers, branches) {
  var headers = [
    "التاريخ", "الوقت", "المصنع / الشركة",
    "💶 المسدد بالأورو (EUR)", "💵 المسدد بالدولار (USD)", "🎁 التخفيض (Remise $)",
    "المعادل المخصوم من الدين ($)",
    "تخصيص OGX ($)", "تخصيص باتنة ($)", "تخصيص البليدة ($)", "تخصيص وهران ($)",
    "المسجل", "ملاحظات التحويل"
  ];
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#3b0764").setFontColor("#ffffff").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  var rows = [];
  var sumEurPaid = 0;
  var sumUsdPaid = 0;
  var sumRemiseUsd = 0;
  var sumTotalDeductedUsd = 0;
  var sumOgx = 0, sumBatna = 0, sumBlida = 0, sumOran = 0;

  (payments || []).forEach(function(p) {
    var sup = (suppliers || []).find(function(s) { return s.id === p.supplierId; });
    var supName = sup ? sup.name : (p.supplierId || "");
    var timeStr = p.time || (p.createdAt ? p.createdAt.substring(11, 19) : "--:--");
    var alloc = p.branchAllocationsUsd || {};
    var paidCur = (p.paidCurrency || "USD").toUpperCase();
    var amtPaid = p.amountPaid !== undefined ? Number(p.amountPaid) : (Number(p.totalPaidUsd) || 0);
    var remise = Number(p.remiseUsd) || 0;
    var totUsd = Number(p.totalPaidUsd) || 0;

    var amtEur = paidCur === "EUR" ? amtPaid : 0;
    var amtUsd = paidCur === "USD" ? amtPaid : 0;

    var ogxVal = Number(alloc.ogx) || 0;
    var batnaVal = Number(alloc.batna) || 0;
    var blidaVal = Number(alloc.blida) || 0;
    var oranVal = Number(alloc.oran) || 0;

    sumEurPaid += amtEur;
    sumUsdPaid += amtUsd;
    sumRemiseUsd += remise;
    sumTotalDeductedUsd += totUsd;
    sumOgx += ogxVal;
    sumBatna += batnaVal;
    sumBlida += blidaVal;
    sumOran += oranVal;

    rows.push([
      p.date || "",
      timeStr,
      supName,
      amtEur,
      amtUsd,
      remise,
      totUsd,
      ogxVal,
      batnaVal,
      blidaVal,
      oranVal,
      p.recordedBy || "المدير العام (raouf)",
      p.notes || ""
    ]);
  });

  if (rows.length > 0) {
    var range = sheet.getRange(2, 1, rows.length, headers.length);
    range.setValues(rows);
    range.setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat("€#,##0.00"); // عمود المسدد بالأورو
    sheet.getRange(2, 5, rows.length, 2).setNumberFormat("$#,##0.00"); // عمود المسدد بالدولار + Remise
    sheet.getRange(2, 7, rows.length, 5).setNumberFormat("$#,##0.00");

    var totIdx = 2 + rows.length;

    sheet.getRange(totIdx, 1, 1, 3).merge().setValue("المجموع الكلي").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(totIdx, 4).setValue(sumEurPaid).setNumberFormat("€#,##0.00"); // مجموع الأورو
    sheet.getRange(totIdx, 5).setValue(sumUsdPaid).setNumberFormat("$#,##0.00"); // مجموع الدولار
    sheet.getRange(totIdx, 6).setValue(sumRemiseUsd).setNumberFormat("$#,##0.00"); // مجموع التخفيض Remise
    sheet.getRange(totIdx, 7).setValue(sumTotalDeductedUsd).setNumberFormat("$#,##0.00"); // إجمالي المخصوم من الدين $
    sheet.getRange(totIdx, 8).setValue(sumOgx).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 9).setValue(sumBatna).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 10).setValue(sumBlida).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 11).setValue(sumOran).setNumberFormat("$#,##0.00");
    sheet.getRange(totIdx, 12, 1, 2).setValue("");

    sheet.getRange(totIdx, 1, 1, headers.length).setBackground("#f3e8ff").setFontWeight("bold");
  }

  sheet.autoResizeColumns(1, headers.length);
}

// 🛠️ دالة مساعدة لإنشاء أو جلب وتهيئة صفحات الشيت (getOrCreateSheet)
function getOrCreateSheet(ss, sheetName, tabIndex) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, tabIndex);
  }
  sheet.clear();
  sheet.clearFormats();
  sheet.setRightToLeft(true);
  return sheet;
}

// دالة فحص الاتصال عبر المتصفح
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Google Sheets Webhook لمؤسسة الفتح يعمل بنجاح 100% مع فصل أعمدة الأورو والدولار!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
