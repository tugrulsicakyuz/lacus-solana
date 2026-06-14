// Program ID'nin string hali — @solana/web3.js IMPORT ETMEZ.
// Hafif (statik) sayfalar PublicKey'e ihtiyaç duymadan bu sabiti kullanır;
// PublicKey gerekiyorsa src/config/solana.ts'teki LACUS_PROGRAM_ID kullanılır.
// Program ID deployment'a bağlı ve sabittir. Vercel/.env üzerinde eski bir
// NEXT_PUBLIC_LACUS_PROGRAM_ID kalmış olsa bile production'ın YANLIŞ programa
// gitmemesi için env override KASTEN kullanılmıyor (sabit hardcode).
export const LACUS_PROGRAM_ID_STRING = 'BdRJSxsqbQZ12xuM9dcEQXuQ9R8AHvfTfMq6EppmEUoH';

// Tanı: tarayıcı konsolunda aktif program ID'yi göster.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info('[Lacus] active program id =', LACUS_PROGRAM_ID_STRING);
}
