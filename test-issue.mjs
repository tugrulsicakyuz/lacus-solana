import pkg from '@coral-xyz/anchor';
const { AnchorProvider, Program, BN, setProvider } = pkg;
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { readFileSync } from 'fs';
import bs58 from 'bs58';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const IDL = require('./src/lib/lacus-idl.json');

const PROGRAM_ID = new PublicKey('Fnw9tWvwyMXieH35WhFfDz7behbDo1teBrVJZ4pZq7rL');
const RPC = 'https://api.devnet.solana.com';

// Use the faucet keypair as signer (it has devnet SOL)
const FAUCET_SECRET = '57QZjzV2WQUueLLEYVVtdw8Xor5uhZcujXRkdhNmmW8bb9xAWk6VKyRneJsXHLsDFWcRYVagZpv1a2nD7BejzDiw';
const keypair = Keypair.fromSecretKey(bs58.decode(FAUCET_SECRET));

console.log('Signer:', keypair.publicKey.toBase58());

const connection = new Connection(RPC, 'confirmed');

// Check balance
const balance = await connection.getBalance(keypair.publicKey);
console.log('Balance:', balance / 1e9, 'SOL');

// Build wallet adapter compatible object
const wallet = {
  publicKey: keypair.publicKey,
  signTransaction: async (tx) => { tx.sign(keypair); return tx; },
  signAllTransactions: async (txs) => { txs.forEach(tx => tx.sign(keypair)); return txs; },
};

const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
setProvider(provider);
const program = new Program(IDL, provider);

// Get factory state
function getFactoryStatePDA() {
  return PublicKey.findProgramAddressSync([Buffer.from('factory')], PROGRAM_ID);
}
function getBondStatePDA(bondId) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(bondId));
  return PublicKey.findProgramAddressSync([Buffer.from('bond'), buf], PROGRAM_ID);
}
function getBondMintPDA(bondStatePubkey) {
  return PublicKey.findProgramAddressSync([Buffer.from('mint'), bondStatePubkey.toBuffer()], PROGRAM_ID);
}

const [factoryStatePDA] = getFactoryStatePDA();
const factoryState = await program.account.factoryState.fetch(factoryStatePDA);
console.log('Factory bond_count:', factoryState.bondCount.toNumber());

const bondId = factoryState.bondCount.toNumber();
const [bondStatePDA] = getBondStatePDA(bondId);
const [bondMintPDA] = getBondMintPDA(bondStatePDA);
const bondTokenVault = await getAssociatedTokenAddress(bondMintPDA, bondStatePDA, true);

console.log('bondId:', bondId);
console.log('bondStatePDA:', bondStatePDA.toBase58());
console.log('bondMintPDA:', bondMintPDA.toBase58());
console.log('bondTokenVault:', bondTokenVault.toBase58());

// Build hash
const msgBuffer = new TextEncoder().encode('test-bond');
const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
const loanAgreementHash = Array.from(new Uint8Array(hashBuffer));

const maturityTimestamp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600; // 1 year from now

console.log('\nBuilding transaction...');
try {
  const tx = await program.methods
    .issueBond({
      name: 'Test Bond',
      symbol: 'TBON',
      faceValue: new BN(100_000_000), // 0.1 SOL
      couponRateBps: 800,
      maturityTimestamp: new BN(maturityTimestamp),
      maxSupply: new BN(1000),
      loanAgreementHash,
    })
    .accounts({
      factoryState: factoryStatePDA,
      bondState: bondStatePDA,
      bondMint: bondMintPDA,
      bondTokenVault,
      issuer: keypair.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  // Simulate first
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;

  console.log('Simulating...');
  const sim = await connection.simulateTransaction(tx);
  console.log('Simulation error:', sim.value.err);
  console.log('Simulation logs:');
  sim.value.logs?.forEach(l => console.log(' ', l));

  if (!sim.value.err) {
    console.log('\nSimulation passed! Sending...');
    tx.sign(keypair);
    const sig = await connection.sendRawTransaction(tx.serialize());
    console.log('TX sent:', sig);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('CONFIRMED!');
  }
} catch (e) {
  console.error('Error building tx:', e.message);
  console.error(e);
}
