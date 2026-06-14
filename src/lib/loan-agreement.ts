// Loan agreement: tek kaynak modül.
// Sabit şablon + kanonik metin + SHA-256 hash. İhraç (issue), satın alma (buy)
// ve doğrulama (verify) AYNI fonksiyonları kullanır ki iki tarafta birebir aynı
// hash üretilsin. Zincire yalnızca bu metnin hash'i gider (loan_agreement_hash);
// metnin kendisi Supabase'de saklanır.

export const AGREEMENT_TEMPLATE_VERSION = 'lacus-loan-v2';

// Dikkat: bondId BİLEREK yok. İhraç anında bondId henüz kesinleşmediği için
// (factory.bond_count tx ile artar) hash'lenen metne bondId konmaz. Sözleşmeyi
// tanımlayan şey terms'in kendisi; doğrulamada on-chain terms'ten metin yeniden
// üretilince aynı hash çıkar.
export interface AgreementTerms {
  issuer: string; // base58 pubkey
  name: string;
  symbol: string;
  faceValueLamports: number; // ham on-chain u64 (lamport)
  couponRateBps: number;
  maturityTimestamp: number; // unix saniye
  maxSupply: number;
}

// Determinizm notu: hash'lenen metin yalnızca ham on-chain değerlerden ve
// ortamdan bağımsız (UTC, sabit locale) formatlamadan üretilir. Böylece ihraç
// anında üretilen metin ile sonradan doğrulamada üretilen metin aynı çıkar.
const solFromLamports = (lamports: number) => (lamports / 1e9).toString();

const utcDate = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

export function buildAgreementText(t: AgreementTerms): string {
  const faceSol = solFromLamports(t.faceValueLamports);
  const couponPct = (t.couponRateBps / 100).toFixed(2);
  const units = t.maxSupply.toLocaleString('en-US');
  const maturity = utcDate(t.maturityTimestamp);

  return [
    'LACUS TOKENIZED LOAN AGREEMENT',
    `Template: ${AGREEMENT_TEMPLATE_VERSION}`,
    '',
    `This loan agreement ("Agreement") is entered into between ${t.name} ("Borrower"), acting through Solana wallet ${t.issuer}, and the undersigned token holder ("Lender").`,
    '',
    `1. Instrument. The Borrower issues a tokenized bond identified as ${t.symbol} recorded on the Solana blockchain.`,
    `2. Principal. The face value is ${faceSol} SOL per unit. Up to ${units} units may be issued in this series.`,
    `3. Coupon. The Borrower intends to pay a coupon of ${couponPct}% per annum, payable as yield deposited to the on-chain bond account.`,
    `4. Maturity. The bond matures on ${maturity} (UTC). On or after maturity, and once the Borrower has deposited principal, each Lender may redeem units for a pro-rata share of the deposited principal.`,
    '5. Repayment. The Borrower agrees to deposit coupon and principal to the on-chain bond account. Distribution to Lenders is executed by the Lacus smart contract; Lacus never takes custody of funds.',
    '6. Non-transferable. Units are recorded as a non-transferable position in the Lacus program. They are not SPL tokens and cannot be transferred, sold, or traded. Each Lender\'s rights under this Agreement attach to their recorded position.',
    '7. Electronic acceptance. By signing this Agreement with their Solana wallet, each party consents to transact electronically and adopts the wallet signature as their signature on this exact document.',
    '8. Identity. Each party is responsible for any identity verification (KYC) required by the platform or by law before issuing or purchasing.',
    '',
    `Document hash is recorded immutably on Solana as the bond's loan_agreement_hash. This text is the authoritative agreement; any displayed summary is for convenience only.`,
  ].join('\n');
}

export interface AgreementHash {
  hashBytes: Uint8Array; // 32 bayt, issue_bond'a gider
  hashHex: string; // gösterim/karşılaştırma için
}

export async function hashAgreementText(text: string): Promise<AgreementHash> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf as BufferSource);
  const hashBytes = new Uint8Array(digest);
  const hashHex = bytesToHex(hashBytes);
  return { hashBytes, hashHex };
}

// terms -> metin + hash, tek çağrıda.
export async function buildAndHashAgreement(
  t: AgreementTerms
): Promise<{ text: string } & AgreementHash> {
  const text = buildAgreementText(t);
  const hash = await hashAgreementText(text);
  return { text, ...hash };
}

export function bytesToHex(bytes: ArrayLike<number>): string {
  return Array.from(bytes)
    .map((b) => (b & 0xff).toString(16).padStart(2, '0'))
    .join('');
}

// Kısaltılmış gösterim: 9f2a7c…e41b
export function shortHash(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}
