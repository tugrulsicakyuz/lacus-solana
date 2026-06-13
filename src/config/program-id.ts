// Program ID'nin string hali — @solana/web3.js IMPORT ETMEZ.
// Hafif (statik) sayfalar PublicKey'e ihtiyaç duymadan bu sabiti kullanır;
// PublicKey gerekiyorsa src/config/solana.ts'teki LACUS_PROGRAM_ID kullanılır.
export const LACUS_PROGRAM_ID_STRING =
  process.env.NEXT_PUBLIC_LACUS_PROGRAM_ID ?? '87fieWCffnauPhnHHM5TFqtRPNTcvup3VGUiW6Vae3PQ';
