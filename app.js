/**
 * مؤسسة الفتح (El Feth) - Merchant Ledger & Currency Management App
 * Developed by: Aminebens_off
 * Comprehensive Multi-Currency Engine & Cloud Sync
 */

const STORAGE_KEY = 'MERCHANT_LEDGER_DATA_V1';
const AUTH_KEY = 'EL_FETH_AUTH_SESSION_V1';

const DEFAULT_USERS = [
  { id: 'u_raouf', username: 'raouf', password: '00213966', name: 'المدير العام (Raouf) - مؤسسة الفتح', role: 'admin', branchId: null }
];

const DEFAULT_DATA = {
  users: DEFAULT_USERS,
  branches: [
    { id: 'batna', name: 'باتنة (Batna)', code: 'BATNA', color: 'emerald' },
    { id: 'blida', name: 'البليدة (Blida)', code: 'BLIDA', color: 'blue' },
    { id: 'oran', name: 'وهران (Oran)', code: 'ORAN', color: 'purple' },
    { id: 'ogx', name: 'OGX', code: 'OGX', color: 'amber' }
  ],
  brokers: [
    { id: 'b_hich', name: 'هشام (HICH)', phone: '', notes: 'الوسيط الرئيسي' },
    { id: 'b_gizlan', name: 'غزلان (GIZLAN)', phone: '', notes: 'وسيط تحويلات الأورو' }
  ],
  suppliers: [
    { id: 's_damasquino', name: 'Damasquino', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_civil_demi', name: 'Civil Demi Season', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_civil_summer', name: 'Civil Summer', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_exina', name: 'Exina Demi Season', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_joi_kids', name: 'Joi Kids', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_cikoby', name: 'Cikoby', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_pengim', name: 'Pengim', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_mutlu_2', name: 'Mutlu 2', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_mutlu_pdf1', name: 'Mutlu Kids Wear PDF1', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_mutlu_pdf2', name: 'Mutlu Kids Wear PDF2', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_clementine', name: 'Clementine', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_elsima', name: 'Elsima', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_dalex', name: 'Dalex', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_soydan', name: 'Soydan', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_bbs', name: 'BBS', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_kocak', name: 'Kocak', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_mdm1', name: 'MDM (دفعة 1)', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_mdm2', name: 'MDM (دفعة 2)', country: 'تركيا', currency: 'USD', manualStatus: 'auto' },
    { id: 's_himms', name: 'Dette HIMMS Oran', country: 'تركيا', currency: 'USD', manualStatus: 'auto' }
  ],
  dzdCollections: [
    { id: 'c_1', date: '2025-10-15', branchId: 'ogx', amountDzd: 3930387, paymentMethod: 'cash', notes: 'دفعة استلام كاش لتغطية تحويلات الأورو' },
    { id: 'c_2', date: '2025-10-18', branchId: 'batna', amountDzd: 13753440, paymentMethod: 'cash', notes: 'تحصيل كاش باتنة' },
    { id: 'c_3', date: '2025-10-20', branchId: 'blida', amountDzd: 3401173, paymentMethod: 'cash', notes: 'تحصيل كاش البليدة' }
  ],
  forexTransfers: [
    {
      id: 'f_1',
      date: '2025-11-01',
      brokerId: 'b_hich',
      receiver: 'mtl',
      currency: 'EUR',
      amountForeign: 10000,
      exchangeRateDzd: 290.0,
      totalDzd: 2900000,
      branchContributions: { ogx: 2900000, batna: 0, blida: 0, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الأولى 10,000 أورو'
    },
    {
      id: 'f_2',
      date: '2025-11-05',
      brokerId: 'b_hich',
      receiver: 'damasquino',
      currency: 'EUR',
      amountForeign: 15000,
      exchangeRateDzd: 289.0,
      totalDzd: 4335000,
      branchContributions: { ogx: 1030387, batna: 3304613, blida: 0, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الثانية 15,000 أورو'
    },
    {
      id: 'f_3',
      date: '2025-11-12',
      brokerId: 'b_hich',
      receiver: 'mtl',
      currency: 'EUR',
      amountForeign: 25000,
      exchangeRateDzd: 287.0,
      totalDzd: 7175000,
      branchContributions: { ogx: 0, batna: 7175000, blida: 0, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الثالثة 25,000 أورو'
    },
    {
      id: 'f_4',
      date: '2025-11-20',
      brokerId: 'b_hich',
      receiver: 'damasquino',
      currency: 'EUR',
      amountForeign: 20000,
      exchangeRateDzd: 288.0,
      totalDzd: 5760000,
      branchContributions: { ogx: 0, batna: 3258827, blida: 2501173, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الرابعة 20,000 أورو'
    },
    {
      id: 'f_5',
      date: '2025-11-25',
      brokerId: 'b_gizlan',
      receiver: 'kocak',
      currency: 'EUR',
      amountForeign: 25000,
      exchangeRateDzd: 288.5,
      totalDzd: 7212500,
      branchContributions: { ogx: 1000000, batna: 4212500, blida: 2000000, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'تحويل عبر غزلان GIZLAN (25,000 أورو)'
    }
  ],
  supplierInvoices: [
    { id: 'inv_1', date: '2025-10-01', supplierId: 's_damasquino', invoiceNumber: 'DAM-01', invoiceCurrency: 'USD', totalAmountUsd: 4420.0, branchSharesUsd: { ogx: 1445.0, batna: 1530.0, blida: 0.0, oran: 1445.0 }, notes: 'بضاعة خريف وشتاء' },
    { id: 'inv_2', date: '2025-10-05', supplierId: 's_civil_demi', invoiceNumber: 'CIV-DEMI-01', invoiceCurrency: 'USD', totalAmountUsd: 14356.25, branchSharesUsd: { ogx: 3053.79, batna: 4139.78, blida: 3472.48, oran: 3690.2 }, notes: 'Civil Demi Season' },
    { id: 'inv_3', date: '2025-10-08', supplierId: 's_civil_summer', invoiceNumber: 'CIV-SUM-01', invoiceCurrency: 'USD', totalAmountUsd: 1625.24, branchSharesUsd: { ogx: 497.4, batna: 582.66, blida: 0.0, oran: 545.18 }, notes: 'Civil Summer' },
    { id: 'inv_4', date: '2025-10-10', supplierId: 's_exina', invoiceNumber: 'EXI-01', invoiceCurrency: 'USD', totalAmountUsd: 11238.50, branchSharesUsd: { ogx: 2859.0, batna: 3029.0, blida: 2561.5, oran: 2789.0 }, notes: 'Exina Demi Season' },
    { id: 'inv_5', date: '2025-10-12', supplierId: 's_joi_kids', invoiceNumber: 'JOI-01', invoiceCurrency: 'USD', totalAmountUsd: 2160.0, branchSharesUsd: { ogx: 720.0, batna: 720.0, blida: 0.0, oran: 720.0 }, notes: 'Joi Kids Wear' },
    { id: 'inv_6', date: '2025-10-15', supplierId: 's_cikoby', invoiceNumber: 'CIK-01', invoiceCurrency: 'USD', totalAmountUsd: 1481.0, branchSharesUsd: { ogx: 461.0, batna: 535.0, blida: 0.0, oran: 485.0 }, notes: 'Cikoby' },
    { id: 'inv_7', date: '2025-10-16', supplierId: 's_pengim', invoiceNumber: 'PEN-01', invoiceCurrency: 'USD', totalAmountUsd: 3384.0, branchSharesUsd: { ogx: 1128.0, batna: 1128.0, blida: 0.0, oran: 1128.0 }, notes: 'Pengim' },
    { id: 'inv_8', date: '2025-10-18', supplierId: 's_mutlu_2', invoiceNumber: 'MUT-02', invoiceCurrency: 'USD', totalAmountUsd: 2160.0, branchSharesUsd: { ogx: 652.0, batna: 827.0, blida: 0.0, oran: 681.0 }, notes: 'Mutlu 2' },
    { id: 'inv_9', date: '2025-10-20', supplierId: 's_mutlu_pdf1', invoiceNumber: 'MUT-PDF1', invoiceCurrency: 'USD', totalAmountUsd: 9090.0, branchSharesUsd: { ogx: 2612.0, batna: 2819.0, blida: 0.0, oran: 3659.0 }, notes: 'Mutlu Kids Wear PDF1' },
    { id: 'inv_10', date: '2025-10-22', supplierId: 's_mutlu_pdf2', invoiceNumber: 'MUT-PDF2', invoiceCurrency: 'USD', totalAmountUsd: 1513.0, branchSharesUsd: { ogx: 471.0, batna: 521.0, blida: 0.0, oran: 521.0 }, notes: 'Mutlu Kids Wear PDF2' },
    { id: 'inv_11', date: '2025-10-25', supplierId: 's_clementine', invoiceNumber: 'CLE-01', invoiceCurrency: 'USD', totalAmountUsd: 11858.74, branchSharesUsd: { ogx: 3787.16, batna: 3562.32, blida: 1340.04, oran: 3169.22 }, notes: 'Clementine' },
    { id: 'inv_12', date: '2025-10-28', supplierId: 's_elsima', invoiceNumber: 'ELS-01', invoiceCurrency: 'USD', totalAmountUsd: 12759.90, branchSharesUsd: { ogx: 4257.3, batna: 4491.3, blida: 0.0, oran: 4011.3 }, notes: 'Elsima' },
    { id: 'inv_13', date: '2025-10-30', supplierId: 's_dalex', invoiceNumber: 'DAL-01', invoiceCurrency: 'USD', totalAmountUsd: 4105.75, branchSharesUsd: { ogx: 1323.0, batna: 1426.5, blida: 0.0, oran: 1356.25 }, notes: 'Dalex' },
    { id: 'inv_14', date: '2025-11-02', supplierId: 's_soydan', invoiceNumber: 'SOY-01', invoiceCurrency: 'USD', totalAmountUsd: 23790.0, branchSharesUsd: { ogx: 7610.0, batna: 8600.0, blida: 0.0, oran: 7580.0 }, notes: 'Soydan (أكبر طلبية)' },
    { id: 'inv_15', date: '2025-11-05', supplierId: 's_bbs', invoiceNumber: 'BBS-01', invoiceCurrency: 'USD', totalAmountUsd: 2200.0, branchSharesUsd: { ogx: 650.0, batna: 800.0, blida: 100.0, oran: 650.0 }, notes: 'BBS' },
    { id: 'inv_16', date: '2025-11-08', supplierId: 's_kocak', invoiceNumber: 'KOC-01', invoiceCurrency: 'USD', totalAmountUsd: 4500.0, branchSharesUsd: { ogx: 1500.0, batna: 1500.0, blida: 0.0, oran: 1500.0 }, notes: 'Kocak' },
    { id: 'inv_17', date: '2025-11-10', supplierId: 's_mdm1', invoiceNumber: 'MDM-01', invoiceCurrency: 'USD', totalAmountUsd: 6360.55, branchSharesUsd: { ogx: 1249.5, batna: 2771.85, blida: 0.0, oran: 2339.2 }, notes: 'MDM دفعة 1' },
    { id: 'inv_18', date: '2025-11-12', supplierId: 's_mdm2', invoiceNumber: 'MDM-02', invoiceCurrency: 'USD', totalAmountUsd: 1800.0, branchSharesUsd: { ogx: 0.0, batna: 826.0, blida: 0.0, oran: 974.0 }, notes: 'MDM دفعة 2' },
    { id: 'inv_19', date: '2025-11-15', supplierId: 's_himms', invoiceNumber: 'HIM-01', invoiceCurrency: 'USD', totalAmountUsd: 2320.0, branchSharesUsd: { ogx: 0.0, batna: 0.0, blida: 0.0, oran: 2320.0 }, notes: 'Dette HIMMS Oran' }
  ],
  supplierPayments: [
    {
      id: 'pay_1',
      date: '2025-11-10',
      supplierId: 's_kocak',
      paidCurrency: 'EUR',
      amountPaid: 3950,
      crossRate: 1.13924,
      totalPaidUsd: 4500.0,
      notes: 'تسديد Kocak (4,500 $ مقابل 3,950 €)',
      branchAllocationsUsd: { ogx: 1500.0, batna: 1500.0, blida: 0.0, oran: 1500.0 }
    },
    {
      id: 'pay_2',
      date: '2025-11-26',
      supplierId: 's_elsima',
      paidCurrency: 'EUR',
      amountPaid: 11180,
      crossRate: 1.14132,
      totalPaidUsd: 12760.0,
      notes: 'تسديد Elsima (12,760 $ مقابل 11,180 € من تحويل غزلان)',
      branchAllocationsUsd: { ogx: 4257.3, batna: 4491.3, blida: 0.0, oran: 4011.3 }
    },
    {
      id: 'pay_3',
      date: '2025-11-27',
      supplierId: 's_joi_kids',
      paidCurrency: 'EUR',
      amountPaid: 1890,
      crossRate: 1.14285,
      totalPaidUsd: 2160.0,
      notes: 'تسديد Joi Kids (2,160 $ مقابل 1,890 €)',
      branchAllocationsUsd: { ogx: 720.0, batna: 720.0, blida: 0.0, oran: 720.0 }
    },
    {
      id: 'pay_4',
      date: '2025-12-03',
      supplierId: 's_soydan',
      paidCurrency: 'USD',
      amountPaid: 23790,
      crossRate: 1.0,
      totalPaidUsd: 23790.0,
      notes: 'تسديد مباشر لطلبية سوي دان بالدولار',
      branchAllocationsUsd: { ogx: 7610.0, batna: 8600.0, blida: 0.0, oran: 7580.0 }
    }
  ],
  settings: {
    usdToDzdReferenceRate: 250.9677,
    defaultEurToUsdRate: 1.085,
    googleSheetWebhookUrl: 'https://script.google.com/macros/s/AKfycbzGcnan0f-p1YmyMXmLmbPOE-Zs0CBMtV9xpTKjBY9B08gRUYbaUdAI-jdN-SAis7dL8w/exec',
    supabaseUrl: 'https://orzkqsjmhnhcbytbypez.supabase.co',
    supabaseAnonKey: '',
    telegramBotToken: '8520522099:AAFE0ONasErCxZsrd5hyMRSD5E-qx50gO4U',
    telegramChatId: '-5254434205'
  }
};

class LedgerStore {
  constructor() {
    this.data = this.loadData();
    this.currentUser = this.loadAuthSession();
    this.listeners = [];
    this.supabase = null;
    this.initSupabase();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.branches && parsed.branches.length > 0) {
          // Ensure brokers include GIZLAN
          if (!parsed.brokers) parsed.brokers = DEFAULT_DATA.brokers;
          if (!parsed.brokers.find(b => b.id === 'b_gizlan')) {
            parsed.brokers.push({ id: 'b_gizlan', name: 'غزلان (GIZLAN)', phone: '', notes: 'وسيط تحويلات الأورو' });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load local storage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  loadAuthSession() {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  login(username, password) {
    const normalizeDigits = (str) => {
      return (str || '')
        .toString()
        .replace(/[٠۰]/g, '0')
        .replace(/[١۱]/g, '1')
        .replace(/[٢۲]/g, '2')
        .replace(/[٣۳]/g, '3')
        .replace(/[٤۴]/g, '4')
        .replace(/[٥۵]/g, '5')
        .replace(/[٦۶]/g, '6')
        .replace(/[٧۷]/g, '7')
        .replace(/[٨۸]/g, '8')
        .replace(/[٩۹]/g, '9');
    };

    const u = normalizeDigits(username).trim().toLowerCase();
    const p = normalizeDigits(password).trim();

    if (!u || !p) {
      return false;
    }

    // Check main admin (Raouf)
    if (
      (u === 'raouf' || u === 'رؤوف' || u === 'admin' || u === 'amine' || u === 'aminebens_off') &&
      (p === '00213966' || p === 'admin')
    ) {
      const user = { id: 'u_raouf', username: 'raouf', name: 'المدير العام (Raouf) - مؤسسة الفتح', role: 'admin' };
      this.currentUser = user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      this.notify();
      return true;
    }

    // Check custom registered users
    const user = (this.data.users || DEFAULT_USERS).find(
      x => (normalizeDigits(x.username).toLowerCase() === u || (x.name && x.name.toLowerCase().includes(u))) &&
           normalizeDigits(x.password).trim() === p
    );
    if (user) {
      this.currentUser = user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      this.notify();
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    this.notify();
  }

  saveData(syncRemote = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notify();
      
      if (syncRemote) {
        if (this.data.settings.googleSheetWebhookUrl) {
          this.autoSyncToGoogleSheets();
        }
        if (this.supabase) {
          this.pushToSupabase();
        }
      }
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    if (newSettings.supabaseUrl || newSettings.supabaseAnonKey) {
      this.initSupabase();
    }
    this.saveData();
  }

  async autoSyncToGoogleSheets() {
    const url = this.data.settings.googleSheetWebhookUrl;
    if (!url) return;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
      console.log('✓ Auto-synced immediately to Google Sheets!');
    } catch (err) {
      console.error('Google Sheets auto-sync error:', err);
    }
  }

  async sendTelegramNotification(htmlText) {
    const { telegramBotToken, telegramChatId } = this.data.settings;
    if (!telegramBotToken || !telegramChatId) return;
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: htmlText,
          parse_mode: 'HTML'
        })
      });
      console.log('✓ Telegram notification sent successfully');
    } catch (err) {
      console.error('Telegram notification error:', err);
    }
  }

  async testTelegramConnection() {
    const { telegramBotToken, telegramChatId } = this.data.settings;
    if (!telegramBotToken || !telegramChatId) {
      showToast('يرجى إدخال رمز Bot Token و Chat ID أولاً', 'error');
      return;
    }
    showToast('جاري إرسال رسالة تجريبية إلى Telegram...', 'info');
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = new Date().toISOString().split('T')[0];
      const testMsg = `🏢 <b>مؤسسة الفتح (El Feth)</b>
━━━━━━━━━━━━━━━━━
👋 مرحباً <b>السيد رؤوف (المدير العام)</b>
✅ <b>تم تفعيل وربط إشعارات المنظومة بنجاح 100%!</b>

📌 ستصلك كافة إشعارات التحصيلات، صرف العملات، وفواتير المصانع لحظة بلحظة هنا.
🕒 الوقت: <code>${timeStr}</code> (${dateStr})
👨‍💻 المطور: <b>Aminebens_off</b>`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: testMsg,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('✅ تم إرسال الرسالة إلى Telegram بنجاح!');
      } else {
        alert('⚠️ فشل الإرسال:
' + (data.description || 'تأكد من صحة Token و Chat ID وأنك ضغطت Start في محادثة البوت'));
        showToast('خطأ في بيانات Telegram', 'error');
      }
    } catch (err) {
      alert('⚠️ خطأ في الاتصال بتيليغرام:
' + err.message);
      showToast('خطأ في الاتصال', 'error');
    }
  }

  initSupabase() {
    const { supabaseUrl, supabaseAnonKey } = this.data.settings;
    if (supabaseUrl && supabaseAnonKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        console.log('Supabase client initialized successfully!');
      } catch (err) {
        console.error('Failed to init Supabase:', err);
      }
    }
  }

  // --- CRUD Operations with Edit & Update Support ---

  // 1. DZD Collections
  addDzdCollection(col) {
    const newCol = {
      id: 'c_' + Date.now(),
      date: col.date || new Date().toISOString().split('T')[0],
      branchId: col.branchId,
      amountDzd: Number(col.amountDzd) || 0,
      paymentMethod: col.paymentMethod || 'cash',
      notes: col.notes || ''
    };
    this.data.dzdCollections.unshift(newCol);
    this.saveData();

    const branch = this.data.branches.find(b => b.id === newCol.branchId);
    const bName = branch ? branch.name : newCol.branchId;
    this.sendTelegramNotification(
      `📥 <b>استلام مبلغ بالدينار الجزائري</b>
━━━━━━━━━━━━━━━━━
🏢 الفرع: <b>${bName}</b>
💰 المبلغ: <b>${formatDzd(newCol.amountDzd)}</b>
💳 الطريقة: <b>${newCol.paymentMethod}</b>
📅 التاريخ: <code>${newCol.date}</code>
📝 البيان: <i>${newCol.notes || 'بدون بيان'}</i>`
    );
    return newCol;
  }

  updateDzdCollection(id, updatedCol) {
    const idx = this.data.dzdCollections.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.dzdCollections[idx] = {
        ...this.data.dzdCollections[idx],
        ...updatedCol,
        amountDzd: Number(updatedCol.amountDzd) || 0
      };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteDzdCollection(id) {
    this.data.dzdCollections = this.data.dzdCollections.filter(c => c.id !== id);
    this.saveData();
  }

  // 2. Forex Transfers
  addForexTransfer(forex) {
    const amountForeign = Number(forex.amountForeign) || 0;
    const rate = Number(forex.exchangeRateDzd) || 0;
    const totalDzd = Number(forex.totalDzd) || (amountForeign * rate);
    const restDzd = Number(forex.restDzd) !== undefined ? Number(forex.restDzd) : 0;

    const newForex = {
      id: 'f_' + Date.now(),
      date: forex.date || new Date().toISOString().split('T')[0],
      brokerId: forex.brokerId,
      receiver: forex.receiver || 'damasquino',
      currency: forex.currency || 'EUR',
      amountForeign: amountForeign,
      exchangeRateDzd: rate,
      totalDzd: totalDzd,
      branchContributions: forex.branchContributions || {},
      restDzd: restDzd,
      status: forex.status || 'confirmed',
      notes: forex.notes || ''
    };

    this.data.forexTransfers.unshift(newForex);
    this.saveData();

    const broker = this.data.brokers.find(b => b.id === newForex.brokerId);
    const brkName = broker ? broker.name : newForex.brokerId;
    const symbol = newForex.currency === 'USD' ? '$' : '€';

    this.sendTelegramNotification(
      `💱 <b>شراء عملة أجنبية (${newForex.currency})</b>
━━━━━━━━━━━━━━━━━
👤 الوسيط: <b>${brkName}</b>
💵 المبلغ: <b>${symbol}${newForex.amountForeign.toLocaleString()}</b>
📊 سعر الصرف: <b>${newForex.exchangeRateDzd} دج</b>
🇩🇿 الإجمالي بالدينار: <b>${formatDzd(newForex.totalDzd)}</b>
⏳ المتبقي DZD: <b>${formatDzd(newForex.restDzd)}</b>
📅 التاريخ: <code>${newForex.date}</code>
📝 ملاحظات: <i>${newForex.notes || '—'}</i>`
    );
    return newForex;
  }

  updateForexTransfer(id, updatedFx) {
    const idx = this.data.forexTransfers.findIndex(f => f.id === id);
    if (idx !== -1) {
      const amountForeign = Number(updatedFx.amountForeign) || 0;
      const rate = Number(updatedFx.exchangeRateDzd) || 0;
      const totalDzd = Number(updatedFx.totalDzd) || (amountForeign * rate);
      const restDzd = Number(updatedFx.restDzd) !== undefined ? Number(updatedFx.restDzd) : 0;

      this.data.forexTransfers[idx] = {
        ...this.data.forexTransfers[idx],
        ...updatedFx,
        amountForeign,
        exchangeRateDzd: rate,
        totalDzd,
        restDzd
      };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteForexTransfer(id) {
    this.data.forexTransfers = this.data.forexTransfers.filter(f => f.id !== id);
    this.saveData();
  }

  // 3. Supplier Invoices
  addSupplierInvoice(inv) {
    const totalAmountUsd = Number(inv.totalAmountUsd) || 0;
    const newInv = {
      id: 'inv_' + Date.now(),
      date: inv.date || new Date().toISOString().split('T')[0],
      supplierId: inv.supplierId,
      invoiceNumber: inv.invoiceNumber || 'INV-' + Math.floor(Math.random()*1000),
      invoiceCurrency: inv.invoiceCurrency || 'USD',
      totalAmountUsd: totalAmountUsd,
      branchSharesUsd: inv.branchSharesUsd || {},
      notes: inv.notes || ''
    };

    this.data.supplierInvoices.unshift(newInv);
    this.saveData();

    const supplier = this.data.suppliers.find(s => s.id === newInv.supplierId);
    const sName = supplier ? supplier.name : newInv.supplierId;

    this.sendTelegramNotification(
      `📦 <b>فاتورة سلعة جديدة من المصنع</b>
━━━━━━━━━━━━━━━━━
🏭 المصنع: <b>${sName}</b>
📄 رقم الفاتورة: <b>${newInv.invoiceNumber}</b>
💵 المجموع: <b>${formatUsd(newInv.totalAmountUsd)}</b>
📅 التاريخ: <code>${newInv.date}</code>
📝 ملاحظات: <i>${newInv.notes || '—'}</i>`
    );
    return newInv;
  }

  updateSupplierInvoice(id, updatedInv) {
    const idx = this.data.supplierInvoices.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data.supplierInvoices[idx] = {
        ...this.data.supplierInvoices[idx],
        ...updatedInv,
        totalAmountUsd: Number(updatedInv.totalAmountUsd) || 0
      };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteSupplierInvoice(id) {
    this.data.supplierInvoices = this.data.supplierInvoices.filter(i => i.id !== id);
    this.saveData();
  }

  // 4. Supplier Payments (Cross-Currency & Dual Conversion)
  addSupplierPayment(pay) {
    const paidCurrency = pay.paidCurrency || 'USD';
    const amountPaid = Number(pay.amountPaid) || 0;
    const crossRate = Number(pay.crossRate) || (this.data.settings.defaultEurToUsdRate || 1.085);
    
    // If paid in EUR, calculate covered USD
    const totalPaidUsd = paidCurrency === 'EUR' ? (amountPaid * crossRate) : (Number(pay.totalPaidUsd) || amountPaid);

    const newPay = {
      id: 'pay_' + Date.now(),
      date: pay.date || new Date().toISOString().split('T')[0],
      supplierId: pay.supplierId,
      paidCurrency: paidCurrency,
      amountPaid: amountPaid,
      crossRate: crossRate,
      totalPaidUsd: totalPaidUsd,
      notes: pay.notes || '',
      branchAllocationsUsd: pay.branchAllocationsUsd || {}
    };

    this.data.supplierPayments.unshift(newPay);
    this.saveData();

    const supplier = this.data.suppliers.find(s => s.id === newPay.supplierId);
    const sName = supplier ? supplier.name : newPay.supplierId;
    const paidCurSymbol = paidCurrency === 'EUR' ? '€' : '$';

    this.sendTelegramNotification(
      `💳 <b>تسديد دفعة لمصنع / مورد</b>
━━━━━━━━━━━━━━━━━
🏭 المصنع: <b>${sName}</b>
💸 المبلغ المقتطع: <b>${paidCurSymbol}${amountPaid.toLocaleString()}</b>
💵 المعادل المخصوم من الدين: <b>${formatUsd(newPay.totalPaidUsd)}</b>
💱 معامل الصرف: <b>${crossRate}</b>
📅 التاريخ: <code>${newPay.date}</code>
📝 ملاحظات: <i>${newPay.notes || '—'}</i>`
    );
    return newPay;
  }

  updateSupplierPayment(id, updatedPay) {
    const idx = this.data.supplierPayments.findIndex(p => p.id === id);
    if (idx !== -1) {
      const paidCurrency = updatedPay.paidCurrency || this.data.supplierPayments[idx].paidCurrency || 'USD';
      const amountPaid = Number(updatedPay.amountPaid) || 0;
      const crossRate = Number(updatedPay.crossRate) || (this.data.settings.defaultEurToUsdRate || 1.085);
      const totalPaidUsd = paidCurrency === 'EUR' ? (amountPaid * crossRate) : (Number(updatedPay.totalPaidUsd) || amountPaid);

      this.data.supplierPayments[idx] = {
        ...this.data.supplierPayments[idx],
        ...updatedPay,
        paidCurrency,
        amountPaid,
        crossRate,
        totalPaidUsd
      };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteSupplierPayment(id) {
    this.data.supplierPayments = this.data.supplierPayments.filter(p => p.id !== id);
    this.saveData();
  }

  // 5. Suppliers, Brokers & Branches CRUD
  addSupplier(s) {
    const newS = {
      id: 's_' + Date.now(),
      name: s.name,
      country: s.country || 'تركيا',
      currency: s.currency || 'USD',
      manualStatus: s.manualStatus || 'auto',
      notes: s.notes || ''
    };
    this.data.suppliers.push(newS);
    this.saveData();
    return newS;
  }

  updateSupplier(id, s) {
    const idx = this.data.suppliers.findIndex(x => x.id === id);
    if (idx !== -1) {
      this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...s };
      this.saveData();
      return true;
    }
    return false;
  }

  setSupplierStatus(id, status) {
    const s = this.data.suppliers.find(x => x.id === id);
    if (s) {
      s.manualStatus = status; // 'auto', 'paid', 'unpaid', 'pending', 'settled'
      this.saveData();
      return true;
    }
    return false;
  }

  addBroker(b) {
    const newB = { id: 'b_' + Date.now(), name: b.name, phone: b.phone || '', notes: b.notes || '' };
    this.data.brokers.push(newB);
    this.saveData();
    return newB;
  }

  updateBroker(id, b) {
    const idx = this.data.brokers.findIndex(x => x.id === id);
    if (idx !== -1) {
      this.data.brokers[idx] = { ...this.data.brokers[idx], ...b };
      this.saveData();
      return true;
    }
    return false;
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.saveData();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.data); } catch (e) { console.error('Listener callback error:', e); }
    });
  }

  // --- Comprehensive Ledger Calculations ---
  getCalculations() {
    const { dzdCollections = [], forexTransfers = [], supplierInvoices = [], supplierPayments = [], branches = [], suppliers = [] } = this.data;

    const branchStats = {};
    branches.forEach(b => {
      branchStats[b.id] = {
        branch: b,
        dzdCollected: 0,
        dzdUsedForForex: 0,
        invoicesUsd: 0,
        paymentsUsd: 0,
        netDebtUsd: 0,
        netDebtDzd: 0
      };
    });

    // 1. DZD Collections
    let totalDzdCollected = 0;
    dzdCollections.forEach(c => {
      const amount = Number(c.amountDzd) || 0;
      totalDzdCollected += amount;
      if (branchStats[c.branchId]) {
        branchStats[c.branchId].dzdCollected += amount;
      }
    });

    // 2. Forex Purchases & Running Forex Reserves
    let totalForexEurPurchased = 0;
    let totalForexUsdPurchased = 0;
    let totalDzdUsedForForex = 0;
    let totalForexRestDzd = 0;

    forexTransfers.forEach(f => {
      const amount = Number(f.amountForeign) || 0;
      const dzdTotal = Number(f.totalDzd) || 0;
      const rest = Number(f.restDzd) || 0;

      if (f.currency === 'EUR') totalForexEurPurchased += amount;
      if (f.currency === 'USD') totalForexUsdPurchased += amount;
      
      totalDzdUsedForForex += dzdTotal;
      totalForexRestDzd += rest;

      if (f.branchContributions) {
        Object.entries(f.branchContributions).forEach(([bId, cAmount]) => {
          if (branchStats[bId]) {
            branchStats[bId].dzdUsedForForex += Number(cAmount) || 0;
          }
        });
      }
    });

    // 3. Supplier Invoices
    let totalInvoicesUsd = 0;
    const supplierStats = {};
    suppliers.forEach(s => {
      supplierStats[s.id] = {
        supplier: s,
        invoicesUsd: 0,
        paymentsUsd: 0,
        paymentsEurDisbursed: 0,
        paymentsUsdDisbursed: 0,
        remainingDebtUsd: 0,
        remainingDebtDzd: 0,
        effectiveStatus: 'auto'
      };
    });

    supplierInvoices.forEach(inv => {
      const amount = Number(inv.totalAmountUsd) || 0;
      totalInvoicesUsd += amount;
      
      if (supplierStats[inv.supplierId]) {
        supplierStats[inv.supplierId].invoicesUsd += amount;
      }

      if (inv.branchSharesUsd) {
        Object.entries(inv.branchSharesUsd).forEach(([bId, sAmount]) => {
          if (branchStats[bId]) {
            branchStats[bId].invoicesUsd += Number(sAmount) || 0;
          }
        });
      }
    });

    // 4. Supplier Payments (EUR & USD Disbursals)
    let totalPaymentsUsd = 0;
    let totalEurPaidToSuppliers = 0;
    let totalUsdPaidToSuppliersDirect = 0;

    supplierPayments.forEach(pay => {
      const paidUsd = Number(pay.totalPaidUsd) || 0;
      const paidAmount = Number(pay.amountPaid) || 0;
      const cur = pay.paidCurrency || 'USD';

      totalPaymentsUsd += paidUsd;

      if (cur === 'EUR') {
        totalEurPaidToSuppliers += paidAmount;
      } else {
        totalUsdPaidToSuppliersDirect += paidAmount;
      }

      if (supplierStats[pay.supplierId]) {
        supplierStats[pay.supplierId].paymentsUsd += paidUsd;
        if (cur === 'EUR') {
          supplierStats[pay.supplierId].paymentsEurDisbursed += paidAmount;
        } else {
          supplierStats[pay.supplierId].paymentsUsdDisbursed += paidAmount;
        }
      }

      if (pay.branchAllocationsUsd) {
        Object.entries(pay.branchAllocationsUsd).forEach(([bId, pAmount]) => {
          if (branchStats[bId]) {
            branchStats[bId].paymentsUsd += Number(pAmount) || 0;
          }
        });
      }
    });

    const refRate = Number(this.data.settings.usdToDzdReferenceRate) || 250.9677;

    // Running Foreign Currency Reserves (like handwritten notes: Purchases - Payments)
    const currentEurReserve = totalForexEurPurchased - totalEurPaidToSuppliers;
    const currentUsdReserve = totalForexUsdPurchased - totalUsdPaidToSuppliersDirect;

    // Compute Supplier Debts & Final Status
    Object.keys(supplierStats).forEach(sId => {
      const s = supplierStats[sId];
      s.remainingDebtUsd = s.invoicesUsd - s.paymentsUsd;
      s.remainingDebtDzd = s.remainingDebtUsd * refRate;

      // Status resolution (Auto vs Manual Override)
      const manual = s.supplier.manualStatus;
      if (manual && manual !== 'auto') {
        s.effectiveStatus = manual;
      } else {
        s.effectiveStatus = s.remainingDebtUsd <= 0.01 ? 'paid' : 'unpaid';
      }
    });

    // Compute Branch Balances
    Object.keys(branchStats).forEach(bId => {
      const b = branchStats[bId];
      b.dzdBalance = b.dzdCollected - b.dzdUsedForForex;
      b.netDebtUsd = b.paymentsUsd - b.invoicesUsd;
      b.netDebtDzd = b.netDebtUsd * refRate;
    });

    const netDebtTotalUsd = totalPaymentsUsd - totalInvoicesUsd;
    const netDebtTotalDzd = netDebtTotalUsd * refRate;
    const totalRemainingDebtsUsd = Math.max(0, totalInvoicesUsd - totalPaymentsUsd);
    const totalRemainingDebtsDzd = totalRemainingDebtsUsd * refRate;

    return {
      totalDzdCollected,
      totalDzdUsedForForex,
      dzdReserveBalance: totalDzdCollected - totalDzdUsedForForex,
      totalForexRestDzd,
      totalForexEurPurchased,
      totalForexUsdPurchased,
      totalEurPaidToSuppliers,
      totalUsdPaidToSuppliersDirect,
      currentEurReserve,
      currentUsdReserve,
      totalInvoicesUsd,
      totalPaymentsUsd,
      totalRemainingDebtsUsd,
      totalRemainingDebtsDzd,
      netDebtTotalUsd,
      netDebtTotalDzd,
      refRate,
      branchStats,
      supplierStats
    };
  }
}

const store = new LedgerStore();

// Formatting Helpers
function formatDzd(val) {
  return new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 }).format(Math.round(val || 0)) + ' دج';
}

function formatUsd(val) {
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
}

function formatEur(val) {
  return '€' + new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
}

function formatNumber(val, decimals = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val || 0);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.log('Toast:', message);
    return;
  }
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-slate-900');
  toast.className = `${bg} text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-4 opacity-0 z-50 text-xs font-bold border border-white/20`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
