// Paylaşılan sayı/tarih formatlayıcıları — sayfa başına kopya tanımlamayın.

export const formatSOL = (lamports: number) => (lamports / 1e9).toFixed(4);

export const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const timestampToMonths = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.round((timestamp - now) / (30 * 24 * 60 * 60)));
};
