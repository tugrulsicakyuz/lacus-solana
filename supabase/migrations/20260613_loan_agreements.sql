-- Loan agreement + KYC tabloları (MVP).
-- Zincire yalnızca sözleşmenin SHA-256 hash'i gider (bond_state.loan_agreement_hash);
-- metnin kendisi, imzalar ve KYC durumu burada saklanır.
-- Not: RLS, mevcut public tablolarla (bonds, borrower_documents ...) tutarlı olması
-- için bu MVP'de etkinleştirilmedi. Üretimde sıkılaştırılmalı (ayrı iş).

-- İhraççının yayınladığı sözleşme (bond başına bir satır).
create table if not exists public.agreements (
  bond_id integer primary key,
  template_version text not null,
  terms_json jsonb not null,
  agreement_text text not null,
  sha256_hex text not null,
  issuer_wallet text not null,
  issuer_signature text,
  created_at timestamptz not null default now()
);

-- Alıcının kabul + imza kaydı (bond + cüzdan başına bir satır).
create table if not exists public.agreement_acceptances (
  id bigint generated always as identity primary key,
  bond_id integer not null,
  investor_wallet text not null,
  sha256_hex text not null,
  signature text not null,
  accepted_at timestamptz not null default now(),
  unique (bond_id, investor_wallet)
);

create index if not exists agreement_acceptances_bond_id_idx
  on public.agreement_acceptances (bond_id);

-- KYC durumu (cüzdan başına). Varsayılan akış kapalıyken bu tablo boş kalır.
create table if not exists public.kyc_status (
  wallet text primary key,
  status text not null default 'none',
  updated_at timestamptz not null default now()
);
