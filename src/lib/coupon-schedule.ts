// Kupon takvimi: tek kaynak, saf mantık (UI ve sözleşme metni AYNI fonksiyonu kullanır).
//
// Fikir: kupon, protokolün otomatik yaptığı bir şey değil; borçlunun VERDİĞİ bir SÖZ.
// Borçlu ihraçta bir sıklık (frequency) seçer; kupon oranı + vade + sıklıktan kupon
// tarihleri ve birim başına tutar DETERMİNİSTİK olarak türetilir. Bu takvim sözleşme
// metnine girer (metnin hash'i zincirde → söz değiştirilemez ve ispatlı).
//
// Ödeme durumu ise tamamen ON-CHAIN veriden hesaplanır: vaat edilen kümülatif tutara
// karşı yatırılan kümülatif tutar (totalYieldDeposited). Kimseye güvenmek gerekmez:
// "Late is visible. Missing is undeniable."

export type CouponFrequencyMonths = 12 | 6 | 3;

export const FREQUENCY_OPTIONS: { months: CouponFrequencyMonths; label: string; adverb: string }[] = [
  { months: 12, label: "Annual", adverb: "annually" },
  { months: 6, label: "Semi-annual", adverb: "semi-annually" },
  { months: 3, label: "Quarterly", adverb: "quarterly" },
];

export function frequencyLabel(months: number): string {
  return FREQUENCY_OPTIONS.find((f) => f.months === months)?.label ?? `${months}-month`;
}

export function frequencyAdverb(months: number): string {
  return FREQUENCY_OPTIONS.find((f) => f.months === months)?.adverb ?? `every ${months} months`;
}

export interface ScheduleInput {
  faceValueLamports: number;
  couponRateBps: number;
  maturityTimestamp: number; // unix saniye (UTC)
  saleDeadline: number; // unix saniye (UTC) — ilk kupon bundan sonra
  couponFrequencyMonths: CouponFrequencyMonths;
}

export type ScheduleEntryType = "coupon" | "principal";

export interface ScheduleEntry {
  index: number; // kupon sırası (0..N-1); principal için kuponlardan sonra gelir
  type: ScheduleEntryType;
  dateUnix: number; // unix saniye
  perUnitLamports: number; // birim başına ödenecek (kupon ya da anapara)
}

export interface CouponSchedule {
  couponPerUnitLamports: number;
  couponDates: number[]; // kronolojik
  entries: ScheduleEntry[]; // kuponlar + sonda anapara satırı
}

// UTC'de ay ekle/çıkar (deterministik; locale/zaman dilimi bağımsız).
function addMonthsUtc(unixSec: number, months: number): number {
  const d = new Date(unixSec * 1000);
  d.setUTCMonth(d.getUTCMonth() + months);
  return Math.floor(d.getTime() / 1000);
}

// Birim başına bir dönemlik kupon (lamport).
// annual = faceValue * bps/10000; dönemlik = * (period/12).
export function couponPerUnitLamports(
  faceValueLamports: number,
  couponRateBps: number,
  periodMonths: number
): number {
  return Math.round((faceValueLamports * couponRateBps * periodMonths) / 120000);
}

// Kupon tarihlerini vadeden geriye doğru, sıklık adımıyla üret; satış kapanışından
// (saleDeadline) sonrakileri tut. Son tarih = vade (vade gününde son kupon).
export function generateCouponSchedule(input: ScheduleInput): CouponSchedule {
  const { faceValueLamports, couponRateBps, maturityTimestamp, saleDeadline, couponFrequencyMonths } = input;
  const perUnit = couponPerUnitLamports(faceValueLamports, couponRateBps, couponFrequencyMonths);

  const dates: number[] = [];
  for (let k = 0; k < 600; k++) {
    const d = addMonthsUtc(maturityTimestamp, -k * couponFrequencyMonths);
    if (d <= saleDeadline) break;
    dates.push(d);
  }
  if (dates.length === 0) dates.push(maturityTimestamp); // en az vade kuponu
  dates.reverse(); // kronolojik (en eski → en yeni; son = vade)

  const entries: ScheduleEntry[] = dates.map((dateUnix, index) => ({
    index,
    type: "coupon" as const,
    dateUnix,
    perUnitLamports: perUnit,
  }));
  // Vade gününde anapara itfası ayrı satır.
  entries.push({
    index: dates.length,
    type: "principal",
    dateUnix: maturityTimestamp,
    perUnitLamports: faceValueLamports,
  });

  return { couponPerUnitLamports: perUnit, couponDates: dates, entries };
}

export type PaymentStatus = "paid" | "due" | "scheduled";

export interface ScheduleStatusEntry extends ScheduleEntry {
  status: PaymentStatus;
  promisedTotalLamports: number; // bu satır için tüm tutulan birimlerin toplamı (perUnit * tokensSold)
  fundedTotalLamports: number; // bu satıra düşen, fiilen yatırılmış kısım
}

export interface OnChainStatusInput {
  tokensSold: number;
  totalYieldDeposited: number; // lamport (kümülatif)
  totalPrincipalDeposited: number; // lamport (kümülatif)
  principalFunded: boolean;
  faceValueLamports: number;
  maturityTimestamp: number;
  nowSec?: number;
}

// Takvim + on-chain durum → her satır için PAID / DUE / SCHEDULED.
// Kuponlar kronolojik; kümülatif vaat (perUnit*tokensSold*(i+1)) ile totalYieldDeposited kıyaslanır.
export function computeScheduleStatus(
  schedule: CouponSchedule,
  state: OnChainStatusInput
): ScheduleStatusEntry[] {
  const now = state.nowSec ?? Math.floor(Date.now() / 1000);
  const sold = state.tokensSold;
  const perCouponTotal = schedule.couponPerUnitLamports * sold;

  const out: ScheduleStatusEntry[] = [];
  let cumulative = 0;

  for (const entry of schedule.entries) {
    if (entry.type === "coupon") {
      const promised = perCouponTotal;
      cumulative += promised;
      const fundedTowards = Math.max(0, Math.min(promised, state.totalYieldDeposited - (cumulative - promised)));
      let status: PaymentStatus;
      if (sold <= 0) {
        // Henüz hiç birim satılmamış: yükümlülük doğmadı, sadece planlı göster.
        status = "scheduled";
      } else if (state.totalYieldDeposited >= cumulative) {
        status = "paid";
      } else if (now >= entry.dateUnix) {
        status = "due";
      } else {
        status = "scheduled";
      }
      out.push({ ...entry, status, promisedTotalLamports: promised, fundedTotalLamports: fundedTowards });
    } else {
      // principal
      const promised = state.faceValueLamports * sold;
      const covered = state.principalFunded || (sold > 0 && state.totalPrincipalDeposited >= promised);
      let status: PaymentStatus;
      if (sold <= 0) status = "scheduled";
      else if (covered) status = "paid";
      else if (now >= entry.dateUnix) status = "due";
      else status = "scheduled";
      out.push({
        ...entry,
        status,
        promisedTotalLamports: promised,
        fundedTotalLamports: Math.min(promised, state.totalPrincipalDeposited),
      });
    }
  }
  return out;
}

// Sıradaki fonlanacak kupon (issuer'ın bir sonraki ödeyeceği). Yoksa null.
export function nextUnfundedCoupon(statuses: ScheduleStatusEntry[]): ScheduleStatusEntry | null {
  return statuses.find((s) => s.type === "coupon" && s.status !== "paid") ?? null;
}
