// Paylaşılan sayı/tarih formatlayıcıları — sayfa başına kopya tanımlamayın.

export const formatSOL = (lamports: number) => (lamports / 1e9).toFixed(4);

export const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const timestampToMonths = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.round((timestamp - now) / (30 * 24 * 60 * 60)));
};

// Kompakt SOL gösterimi (M/K kısaltmalı). n = SOL (lamport değil).
export const formatSOLCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M SOL`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K SOL`
  : `${n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL`;

// Ay sayısını "Mo / Y / Y Mo" etiketine çevirir.
export const maturityLabel = (months: number) => {
  if (months < 12) return `${months}Mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years}Y` : `${years}Y ${rem}Mo`;
};
