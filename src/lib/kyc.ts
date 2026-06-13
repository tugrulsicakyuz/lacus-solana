'use client';
import { PublicKey } from '@solana/web3.js';
import { supabase } from './supabase';

// KYC dikişi. Varsayılan KAPALI: NEXT_PUBLIC_KYC_ENABLED === 'true' olmadıkça
// requireKyc herkesi geçirir (no-op). Açıldığında kyc_status tablosunda ilgili
// cüzdanın 'approved' olup olmadığına bakar. Gerçek KYC sağlayıcı (Persona,
// Sumsub, Onfido...) sonradan bu tabloyu doldurur; akıştaki tek geçit burası.
export const KYC_ENABLED = process.env.NEXT_PUBLIC_KYC_ENABLED === 'true';

export interface KycResult {
  ok: boolean;
  // 'disabled' = özellik kapalı (herkes geçer); diğerleri kyc_status.status
  status: 'disabled' | 'approved' | 'pending' | 'rejected' | 'none' | 'error';
}

export async function requireKyc(
  wallet: PublicKey | string | null | undefined
): Promise<KycResult> {
  if (!KYC_ENABLED) return { ok: true, status: 'disabled' };
  if (!wallet) return { ok: false, status: 'none' };

  const addr = typeof wallet === 'string' ? wallet : wallet.toBase58();
  try {
    const { data, error } = await supabase
      .from('kyc_status')
      .select('status')
      .eq('wallet', addr)
      .maybeSingle();
    if (error) return { ok: false, status: 'error' };
    const status = (data?.status as KycResult['status']) ?? 'none';
    return { ok: status === 'approved', status };
  } catch {
    return { ok: false, status: 'error' };
  }
}
