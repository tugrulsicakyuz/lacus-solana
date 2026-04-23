import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main() {
  const keyPath = path.join(os.homedir(), '.config/solana/id.json');
  const rawKey = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(rawKey));

  const connection = new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync('./src/lib/lacus-idl.json', 'utf-8'));
  const programId = new PublicKey('Fnw9tWvwyMXieH35WhFfDz7behbDo1teBrVJZ4pZq7rL');
  const program = new Program(idl, provider);

  const [factoryStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('factory')],
    programId
  );

  try {
    const existing = await (program.account as any).factoryState.fetch(factoryStatePDA);
    console.log('Factory already initialized:', factoryStatePDA.toBase58());
    console.log('Bond count:', existing.bondCount.toString());
    return;
  } catch {
    console.log('Factory not yet initialized, creating...');
  }

  const tx = await program.methods
    .initializeFactory(payer.publicKey)
    .accounts({
      factoryState: factoryStatePDA,
      authority: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();

  console.log('Factory initialized! TX:', tx);
  console.log('Factory PDA:', factoryStatePDA.toBase58());
}

main().catch(console.error);
