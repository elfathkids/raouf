-- =========================================================================
-- SQL Schema for مؤسسة الفتح (El Feth) - Merchant Ledger & Currency Management
-- Developed by: Aminebens_off
-- =========================================================================

-- 1. Branches Table (الفروع)
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Brokers Table (الوسطاء والصرافين)
CREATE TABLE IF NOT EXISTS public.brokers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Suppliers Table (المصانع والموردين)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT DEFAULT 'تركيا',
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. DZD Collections (استلامات الدينار من الفروع)
CREATE TABLE IF NOT EXISTS public.dzd_collections (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    amount_dzd NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Forex Transfers via Brokers (شراء العملات الأجنبية)
CREATE TABLE IF NOT EXISTS public.forex_transfers (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    broker_id TEXT,
    receiver TEXT,
    currency TEXT DEFAULT 'EUR',
    amount_foreign NUMERIC NOT NULL,
    exchange_rate_dzd NUMERIC NOT NULL,
    total_dzd NUMERIC NOT NULL,
    branch_contributions JSONB DEFAULT '{}'::jsonb,
    rest_dzd NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Supplier Invoices (فواتير المصانع وتوزيعها)
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE CASCADE,
    invoice_number TEXT,
    invoice_currency TEXT DEFAULT 'USD',
    total_amount_usd NUMERIC NOT NULL,
    branch_shares_usd JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Supplier Payments (سداد فواتير المصانع)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    supplier_id TEXT,
    paid_currency TEXT DEFAULT 'USD',
    total_paid_usd NUMERIC NOT NULL,
    branch_allocations_usd JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. General Settings (الإعدادات العامة وأسعار الصرف المرجعية)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) and allow public read/write for development
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dzd_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forex_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on brokers" ON public.brokers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dzd_collections" ON public.dzd_collections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on forex_transfers" ON public.forex_transfers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on supplier_invoices" ON public.supplier_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on supplier_payments" ON public.supplier_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- Initial Seed Data (البيانات الأولية لمؤسسة الفتح 2025 - 2026)
-- =========================================================================

-- Branches
INSERT INTO public.branches (id, name, code, color) VALUES
('batna', 'باتنة (Batna)', 'BATNA', 'emerald'),
('blida', 'البليدة (Blida)', 'BLIDA', 'blue'),
('oran', 'وهران (Oran)', 'ORAN', 'purple'),
('ogx', 'OGX', 'OGX', 'amber')
ON CONFLICT (id) DO NOTHING;

-- Brokers
INSERT INTO public.brokers (id, name, notes) VALUES
('b_hich', 'هشام (HICH)', 'الوسيط الرئيسي')
ON CONFLICT (id) DO NOTHING;

-- Suppliers (المصانع التركية)
INSERT INTO public.suppliers (id, name, country, currency) VALUES
('s_damasquino', 'Damasquino', 'تركيا', 'USD'),
('s_civil_demi', 'Civil Demi Season', 'تركيا', 'USD'),
('s_civil_summer', 'Civil Summer', 'تركيا', 'USD'),
('s_exina', 'Exina Demi Season', 'تركيا', 'USD'),
('s_joi_kids', 'Joi Kids', 'تركيا', 'USD'),
('s_cikoby', 'Cikoby', 'تركيا', 'USD'),
('s_pengim', 'Pengim', 'تركيا', 'USD'),
('s_mutlu_2', 'Mutlu 2', 'تركيا', 'USD'),
('s_mutlu_pdf1', 'Mutlu Kids Wear PDF1', 'تركيا', 'USD'),
('s_mutlu_pdf2', 'Mutlu Kids Wear PDF2', 'تركيا', 'USD'),
('s_clementine', 'Clementine', 'تركيا', 'USD'),
('s_elsima', 'Elsima', 'تركيا', 'USD'),
('s_dalex', 'Dalex', 'تركيا', 'USD'),
('s_soydan', 'Soydan', 'تركيا', 'USD'),
('s_bbs', 'BBS', 'تركيا', 'USD'),
('s_kocak', 'Kocak', 'تركيا', 'USD'),
('s_mdm1', 'MDM (دفعة 1)', 'تركيا', 'USD'),
('s_mdm2', 'MDM (دفعة 2)', 'تركيا', 'USD'),
('s_himms', 'Dette HIMMS Oran', 'تركيا', 'USD')
ON CONFLICT (id) DO NOTHING;

-- Settings
INSERT INTO public.settings (key, value) VALUES
('ref_rate', '250.9677'::jsonb),
('cross_rate', '1.085'::jsonb)
ON CONFLICT (key) DO NOTHING;
