/**
 * مؤسسة الفتح (El Feth) - Merchant Ledger & Currency Management App
 * Developed by: Aminebens_off
 * Authentication, Supabase & Google Sheets Sync Engine
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
    { id: 'b_hich', name: 'هشام (HICH)', phone: '', notes: 'الوسيط الرئيسي' }
  ],
  suppliers: [
    { id: 's_damasquino', name: 'Damasquino', country: 'تركيا', currency: 'USD' },
    { id: 's_civil_demi', name: 'Civil Demi Season', country: 'تركيا', currency: 'USD' },
    { id: 's_civil_summer', name: 'Civil Summer', country: 'تركيا', currency: 'USD' },
    { id: 's_exina', name: 'Exina Demi Season', country: 'تركيا', currency: 'USD' },
    { id: 's_joi_kids', name: 'Joi Kids', country: 'تركيا', currency: 'USD' },
    { id: 's_cikoby', name: 'Cikoby', country: 'تركيا', currency: 'USD' },
    { id: 's_pengim', name: 'Pengim', country: 'تركيا', currency: 'USD' },
    { id: 's_mutlu_2', name: 'Mutlu 2', country: 'تركيا', currency: 'USD' },
    { id: 's_mutlu_pdf1', name: 'Mutlu Kids Wear PDF1', country: 'تركيا', currency: 'USD' },
    { id: 's_mutlu_pdf2', name: 'Mutlu Kids Wear PDF2', country: 'تركيا', currency: 'USD' },
    { id: 's_clementine', name: 'Clementine', country: 'تركيا', currency: 'USD' },
    { id: 's_elsima', name: 'Elsima', country: 'تركيا', currency: 'USD' },
    { id: 's_dalex', name: 'Dalex', country: 'تركيا', currency: 'USD' },
    { id: 's_soydan', name: 'Soydan', country: 'تركيا', currency: 'USD' },
    { id: 's_bbs', name: 'BBS', country: 'تركيا', currency: 'USD' },
    { id: 's_kocak', name: 'Kocak', country: 'تركيا', currency: 'USD' },
    { id: 's_mdm1', name: 'MDM (دفعة 1)', country: 'تركيا', currency: 'USD' },
    { id: 's_mdm2', name: 'MDM (دفعة 2)', country: 'تركيا', currency: 'USD' },
    { id: 's_himms', name: 'Dette HIMMS Oran', country: 'تركيا', currency: 'USD' }
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
      branchContributions: { ogx: 1400000, batna: 0, blida: 900000, oran: 0 },
      restDzd: 600000,
      status: 'confirmed',
      notes: 'الدفعة الأولى 10,000 أورو'
    },
    {
      id: 'f_2',
      date: '2025-11-15',
      brokerId: 'b_hich',
      receiver: 'mtl',
      currency: 'EUR',
      amountForeign: 20000,
      exchangeRateDzd: 290.0,
      totalDzd: 5800000,
      branchContributions: { ogx: 2530387, batna: 3269613, blida: 0, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الثانية 20,000 أورو'
    },
    {
      id: 'f_3',
      date: '2025-11-28',
      brokerId: 'b_hich',
      receiver: 'mtl',
      currency: 'EUR',
      amountForeign: 25000,
      exchangeRateDzd: 289.0,
      totalDzd: 7225000,
      branchContributions: { ogx: 0, batna: 7225000, blida: 0, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الثالثة 25,000 أورو باتنة'
    },
    {
      id: 'f_4',
      date: '2025-12-03',
      brokerId: 'b_hich',
      receiver: 'mtl',
      currency: 'EUR',
      amountForeign: 20000,
      exchangeRateDzd: 288.0,
      totalDzd: 5760000,
      branchContributions: { ogx: 0, batna: 3258827, blida: 2501173, oran: 0 },
      restDzd: 0,
      status: 'confirmed',
      notes: 'الدفعة الرابعة 20,000 أورو'
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
      date: '2025-12-03',
      notes: 'مجموع الدفعات المسددة للموردين من التحويلات حتى 03-12-2025',
      paidCurrency: 'USD',
      totalPaidUsd: 83109.97,
      branchAllocationsUsd: {
        ogx: 15492.26,
        batna: 54211.43,
        blida: 13406.28,
        oran: 0.0
      }
    }
  ],
  settings: {
    usdToDzdReferenceRate: 250.9677,
    defaultEurToUsdRate: 1.08,
    googleSheetWebhookUrl: '',
    supabaseUrl: '',
    supabaseAnonKey: ''
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
        if (!parsed.users || !parsed.users.some(u => u.username === 'raouf')) {
          parsed.users = DEFAULT_USERS;
        } else {
          const raoufUser = parsed.users.find(u => u.username === 'raouf');
          if (raoufUser) {
            raoufUser.password = '00213966';
            raoufUser.role = 'admin';
            raoufUser.name = 'المدير العام (Raouf) - مؤسسة الفتح';
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading state:', e);
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
    const user = (this.data.users || DEFAULT_USERS).find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim()
    );
    if (user) {
      this.currentUser = user;
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      this.notify();
      return { success: true, user };
    }
    return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
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

  async syncWithSupabase() {
    if (!this.supabase) {
      showToast('يرجى إدخال بيانات Supabase في الإعدادات أولاً', 'error');
      return;
    }
    try {
      showToast('جاري الاتصال بـ Supabase...', 'info');
      const { data: cols } = await this.supabase.from('dzd_collections').select('*');
      if (cols && cols.length > 0) {
        this.data.dzdCollections = cols.map(c => ({
          id: c.id, date: c.date, branchId: c.branch_id, amountDzd: Number(c.amount_dzd),
          paymentMethod: c.payment_method, notes: c.notes
        }));
      }

      const { data: fx } = await this.supabase.from('forex_transfers').select('*');
      if (fx && fx.length > 0) {
        this.data.forexTransfers = fx.map(f => ({
          id: f.id, date: f.date, brokerId: f.broker_id, receiver: f.receiver, currency: f.currency,
          amountForeign: Number(f.amount_foreign), exchangeRateDzd: Number(f.exchange_rate_dzd),
          totalDzd: Number(f.total_dzd), branchContributions: f.branch_contributions || {},
          restDzd: Number(f.rest_dzd) || 0, status: f.status, notes: f.notes
        }));
      }

      const { data: invs } = await this.supabase.from('supplier_invoices').select('*');
      if (invs && invs.length > 0) {
        this.data.supplierInvoices = invs.map(i => ({
          id: i.id, date: i.date, supplierId: i.supplier_id, invoiceNumber: i.invoice_number,
          invoiceCurrency: i.invoice_currency, totalAmountUsd: Number(i.total_amount_usd),
          branchSharesUsd: i.branch_shares_usd || {}, notes: i.notes
        }));
      }

      this.saveData(false);
      showToast('تمت المزامنة بنجاح مع Supabase!');
    } catch (err) {
      console.error(err);
      showToast('خطأ أثناء المزامنة مع Supabase', 'error');
    }
  }

  async uploadAllToSupabase() {
    if (!this.supabase) {
      showToast('يرجى حفظ رابط ومفتاح Supabase أولاً', 'error');
      return { success: false, error: 'No client' };
    }
    showToast('جاري رفع كافة البيانات إلى Supabase...', 'info');
    try {
      // 1. Upload Branches
      if (this.data.branches?.length) {
        const { error: bErr } = await this.supabase.from('branches').upsert(
          this.data.branches.map(b => ({ id: b.id, name: b.name, code: b.code, color: b.color }))
        );
        if (bErr) throw bErr;
      }

      // 2. Upload Brokers
      if (this.data.brokers?.length) {
        const { error: brkErr } = await this.supabase.from('brokers').upsert(
          this.data.brokers.map(b => ({ id: b.id, name: b.name, phone: b.phone || '', notes: b.notes || '' }))
        );
        if (brkErr) throw brkErr;
      }

      // 3. Upload Suppliers
      if (this.data.suppliers?.length) {
        const { error: sErr } = await this.supabase.from('suppliers').upsert(
          this.data.suppliers.map(s => ({ id: s.id, name: s.name, country: s.country, currency: s.currency }))
        );
        if (sErr) throw sErr;
      }

      // 4. Upload DZD Collections
      if (this.data.dzdCollections?.length) {
        const { error: cErr } = await this.supabase.from('dzd_collections').upsert(
          this.data.dzdCollections.map(c => ({
            id: c.id, date: c.date, branch_id: c.branchId, amount_dzd: c.amountDzd,
            payment_method: c.paymentMethod, notes: c.notes
          }))
        );
        if (cErr) throw cErr;
      }

      // 5. Upload Forex Transfers
      if (this.data.forexTransfers?.length) {
        const { error: fErr } = await this.supabase.from('forex_transfers').upsert(
          this.data.forexTransfers.map(f => ({
            id: f.id, date: f.date, broker_id: f.brokerId, receiver: f.receiver, currency: f.currency,
            amount_foreign: f.amountForeign, exchange_rate_dzd: f.exchangeRateDzd, total_dzd: f.totalDzd,
            branch_contributions: f.branchContributions, rest_dzd: f.restDzd, status: f.status, notes: f.notes
          }))
        );
        if (fErr) throw fErr;
      }

      // 6. Upload Supplier Invoices
      if (this.data.supplierInvoices?.length) {
        const { error: iErr } = await this.supabase.from('supplier_invoices').upsert(
          this.data.supplierInvoices.map(i => ({
            id: i.id, date: i.date, supplier_id: i.supplierId, invoice_number: i.invoiceNumber,
            invoice_currency: i.invoiceCurrency, total_amount_usd: i.totalAmountUsd,
            branch_shares_usd: i.branchSharesUsd, notes: i.notes
          }))
        );
        if (iErr) throw iErr;
      }

      showToast('✅ نجح الاتصال! تم رفع كامل البيانات إلى Supabase بنجاح');
      return { success: true };
    } catch (err) {
      console.error('Supabase upload error:', err);
      if (err.message && err.message.includes('relation') && err.message.includes('does not exist')) {
        alert('⚠️ الجداول غير موجودة في Supabase بعد!\n\nيرجى فتح SQL Editor في Supabase، ولصق كود ملف supabase_schema.sql ثم الضغط على RUN لإنشاء الجداول.');
        showToast('الجداول غير موجودة في Supabase', 'error');
      } else if (err.message && (err.message.includes('API key') || err.message.includes('JWT'))) {
        alert('⚠️ مفتاح Supabase Anon Key غير صحيح! يرجى التأكد من نسخه بالكامل.');
        showToast('مفتاح Supabase غير صحيح', 'error');
      } else {
        alert('⚠️ خطأ في الاتصال بـ Supabase:\n' + (err.message || JSON.stringify(err)));
        showToast('خطأ في الاتصال بـ Supabase', 'error');
      }
      return { success: false, error: err };
    }
  }

  async pushToSupabase() {
    if (!this.supabase) return;
    try {
      for (const c of this.data.dzdCollections) {
        await this.supabase.from('dzd_collections').upsert({
          id: c.id, date: c.date, branch_id: c.branchId, amount_dzd: c.amountDzd,
          payment_method: c.paymentMethod, notes: c.notes
        });
      }
      for (const f of this.data.forexTransfers) {
        await this.supabase.from('forex_transfers').upsert({
          id: f.id, date: f.date, broker_id: f.brokerId, receiver: f.receiver, currency: f.currency,
          amount_foreign: f.amountForeign, exchange_rate_dzd: f.exchangeRateDzd, total_dzd: f.totalDzd,
          branch_contributions: f.branchContributions, rest_dzd: f.restDzd, status: f.status, notes: f.notes
        });
      }
      for (const i of this.data.supplierInvoices) {
        await this.supabase.from('supplier_invoices').upsert({
          id: i.id, date: i.date, supplier_id: i.supplierId, invoice_number: i.invoiceNumber,
          invoice_currency: i.invoiceCurrency, total_amount_usd: i.totalAmountUsd,
          branch_shares_usd: i.branchSharesUsd, notes: i.notes
        });
      }
    } catch (err) {
      console.error('Background Supabase push error:', err);
    }
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.saveData();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.data));
  }

  addBranch(name, code, color = 'blue') {
    const id = 'br_' + Date.now();
    this.data.branches.push({ id, name, code, color });
    this.saveData();
    return id;
  }

  addBroker(name, phone = '', notes = '') {
    const id = 'brk_' + Date.now();
    this.data.brokers.push({ id, name, phone, notes });
    this.saveData();
    return id;
  }

  addSupplier(name, country = 'تركيا', currency = 'USD') {
    const id = 'sup_' + Date.now();
    this.data.suppliers.push({ id, name, country, currency });
    this.saveData();
    return id;
  }

  addDzdCollection(collection) {
    const now = new Date();
    const item = {
      id: 'c_' + Date.now(),
      date: collection.date || now.toISOString().split('T')[0],
      time: collection.time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      branchId: collection.branchId,
      amountDzd: Number(collection.amountDzd) || 0,
      paymentMethod: collection.paymentMethod || 'cash',
      notes: collection.notes || '',
      recordedBy: this.currentUser?.name || 'المدير العام (Raouf)',
      createdAt: now.toISOString()
    };
    this.data.dzdCollections.unshift(item);
    this.saveData();
    return item;
  }

  deleteDzdCollection(id) {
    this.data.dzdCollections = this.data.dzdCollections.filter(c => c.id !== id);
    if (this.supabase) {
      this.supabase.from('dzd_collections').delete().eq('id', id).then();
    }
    this.saveData();
  }

  addForexTransfer(transfer) {
    const now = new Date();
    const amountForeign = Number(transfer.amountForeign) || 0;
    const exchangeRateDzd = Number(transfer.exchangeRateDzd) || 0;
    const totalDzd = amountForeign * exchangeRateDzd;

    const item = {
      id: 'f_' + Date.now(),
      date: transfer.date || now.toISOString().split('T')[0],
      time: transfer.time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      brokerId: transfer.brokerId,
      receiver: transfer.receiver || '',
      currency: transfer.currency || 'EUR',
      amountForeign,
      exchangeRateDzd,
      totalDzd,
      branchContributions: transfer.branchContributions || {},
      restDzd: Number(transfer.restDzd) || 0,
      status: transfer.status || 'confirmed',
      notes: transfer.notes || '',
      recordedBy: this.currentUser?.name || 'المدير العام (Raouf)',
      createdAt: now.toISOString()
    };

    this.data.forexTransfers.unshift(item);
    this.saveData();
    return item;
  }

  deleteForexTransfer(id) {
    this.data.forexTransfers = this.data.forexTransfers.filter(f => f.id !== id);
    if (this.supabase) {
      this.supabase.from('forex_transfers').delete().eq('id', id).then();
    }
    this.saveData();
  }

  addSupplierInvoice(invoice) {
    const now = new Date();
    const totalAmountUsd = Number(invoice.totalAmountUsd) || 0;
    const item = {
      id: 'inv_' + Date.now(),
      date: invoice.date || now.toISOString().split('T')[0],
      time: invoice.time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      supplierId: invoice.supplierId,
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceCurrency: invoice.invoiceCurrency || 'USD',
      totalAmountUsd,
      branchSharesUsd: invoice.branchSharesUsd || {},
      notes: invoice.notes || '',
      recordedBy: this.currentUser?.name || 'المدير العام (Raouf)',
      createdAt: now.toISOString()
    };
    this.data.supplierInvoices.unshift(item);
    this.saveData();
    return item;
  }

  deleteSupplierInvoice(id) {
    this.data.supplierInvoices = this.data.supplierInvoices.filter(i => i.id !== id);
    if (this.supabase) {
      this.supabase.from('supplier_invoices').delete().eq('id', id).then();
    }
    this.saveData();
  }

  addSupplierPayment(payment) {
    const now = new Date();
    const item = {
      id: 'pay_' + Date.now(),
      date: payment.date || now.toISOString().split('T')[0],
      time: payment.time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      supplierId: payment.supplierId || '',
      notes: payment.notes || '',
      paidCurrency: payment.paidCurrency || 'USD',
      totalPaidUsd: Number(payment.totalPaidUsd) || 0,
      branchAllocationsUsd: payment.branchAllocationsUsd || {},
      recordedBy: this.currentUser?.name || 'المدير العام (Raouf)',
      createdAt: now.toISOString()
    };
    this.data.supplierPayments.unshift(item);
    this.saveData();
    return item;
  }

  deleteSupplierPayment(id) {
    this.data.supplierPayments = this.data.supplierPayments.filter(p => p.id !== id);
    if (this.supabase) {
      this.supabase.from('supplier_payments').delete().eq('id', id).then();
    }
    this.saveData();
  }

  getCalculations() {
    const { branches, dzdCollections, forexTransfers, supplierInvoices, supplierPayments } = this.data;

    const branchStats = {};
    branches.forEach(b => {
      branchStats[b.id] = {
        name: b.name,
        code: b.code,
        color: b.color,
        dzdCollected: 0,
        dzdUsedForForex: 0,
        dzdBalance: 0,
        invoicesUsd: 0,
        paymentsUsd: 0,
        netDebtUsd: 0,
        netDebtDzd: 0
      };
    });

    let totalDzdCollected = 0;
    dzdCollections.forEach(c => {
      totalDzdCollected += c.amountDzd;
      if (branchStats[c.branchId]) {
        branchStats[c.branchId].dzdCollected += c.amountDzd;
      }
    });

    let totalForexEur = 0;
    let totalForexUsd = 0;
    let totalDzdUsedForForex = 0;

    forexTransfers.forEach(f => {
      if (f.currency === 'EUR') totalForexEur += f.amountForeign;
      if (f.currency === 'USD') totalForexUsd += f.amountForeign;
      totalDzdUsedForForex += f.totalDzd;

      if (f.branchContributions) {
        Object.entries(f.branchContributions).forEach(([bId, amount]) => {
          if (branchStats[bId]) {
            branchStats[bId].dzdUsedForForex += Number(amount) || 0;
          }
        });
      }
    });

    let totalInvoicesUsd = 0;
    supplierInvoices.forEach(inv => {
      totalInvoicesUsd += inv.totalAmountUsd;
      if (inv.branchSharesUsd) {
        Object.entries(inv.branchSharesUsd).forEach(([bId, amount]) => {
          if (branchStats[bId]) {
            branchStats[bId].invoicesUsd += Number(amount) || 0;
          }
        });
      }
    });

    let totalPaymentsUsd = 0;
    supplierPayments.forEach(pay => {
      totalPaymentsUsd += pay.totalPaidUsd;
      if (pay.branchAllocationsUsd) {
        Object.entries(pay.branchAllocationsUsd).forEach(([bId, amount]) => {
          if (branchStats[bId]) {
            branchStats[bId].paymentsUsd += Number(amount) || 0;
          }
        });
      }
    });

    const refRate = this.data.settings.usdToDzdReferenceRate || 250.9677;
    Object.keys(branchStats).forEach(bId => {
      const b = branchStats[bId];
      b.dzdBalance = b.dzdCollected - b.dzdUsedForForex;
      b.netDebtUsd = b.paymentsUsd - b.invoicesUsd;
      b.netDebtDzd = b.netDebtUsd * refRate;
    });

    const netDebtTotalUsd = totalPaymentsUsd - totalInvoicesUsd;
    const netDebtTotalDzd = netDebtTotalUsd * refRate;

    return {
      totalDzdCollected,
      totalDzdUsedForForex,
      dzdReserveBalance: totalDzdCollected - totalDzdUsedForForex,
      totalForexEur,
      totalForexUsd,
      totalInvoicesUsd,
      totalPaymentsUsd,
      netDebtTotalUsd,
      netDebtTotalDzd,
      refRate,
      branchStats
    };
  }
}

const store = new LedgerStore();

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
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-orange-600');
  toast.className = `${bg} text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 translate-y-4 opacity-0 z-50 text-xs font-bold border border-white/20`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
