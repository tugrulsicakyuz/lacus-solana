// Program ID'nin string hali — @solana/web3.js IMPORT ETMEZ.
// Hafif (statik) sayfalar PublicKey'e ihtiyaç duymadan bu sabiti kullanır;
// PublicKey gerekiyorsa src/config/solana.ts'teki LACUS_PROGRAM_ID kullanılır.
export const LACUS_PROGRAM_ID_STRING =
  process.env.NEXT_PUBLIC_LACUS_PROGRAM_ID ?? 'BdRJSxsqbQZ12xuM9dcEQXuQ9R8AHvfTfMq6EppmEUoH';

// Tanı: tarayıcı konsolunda hangi program ID'nin aktif olduğunu göster.
// 87fie… görürsen ortam değişkeni (Vercel/.env.local) hâlâ eski programa işaret ediyor.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info(
    '[Lacus] active program id =', LACUS_PROGRAM_ID_STRING,
    '| source =', process.env.NEXT_PUBLIC_LACUS_PROGRAM_ID ? 'env var' : 'code default'
  );
}
