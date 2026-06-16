// Program ID'nin string hali — @solana/web3.js IMPORT ETMEZ.
// Hafif (statik) sayfalar PublicKey'e ihtiyaç duymadan bu sabiti kullanır;
// PublicKey gerekiyorsa src/config/solana.ts'teki LACUS_PROGRAM_ID kullanılır.
// Program ID deployment'a bağlı ve sabittir. Vercel/.env üzerinde eski bir
// NEXT_PUBLIC_LACUS_PROGRAM_ID kalmış olsa bile production'ın YANLIŞ programa
// gitmemesi için env override KASTEN kullanılmıyor (sabit hardcode).
export const LACUS_PROGRAM_ID_STRING = '9NYAKSppmqJgBPmrKq5zqudEsURvbjSm6Tb4BxCZMS8S';

// Tanı: yalnızca development'ta aktif program ID'yi konsola yaz (prod'da sessiz).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.info('[Lacus] active program id =', LACUS_PROGRAM_ID_STRING);
}
