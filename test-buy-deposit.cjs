// Test buyBond and depositYield
// Run: node test-buy-deposit.cjs

const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program, BN, setProvider } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require('@solana/spl-token');
const bs58 = require('bs58');
const IDL = require('./src/lib/lacus-idl.json');

const PROGRAM_ID = new PublicKey('Fnw9tWvwyMXieH35WhFfDz7behbDo1teBrVJZ4pZq7rL');
const RPC = 'https://api.devnet.solana.com';
const FAUCET_SECRET = '57QZjzV2WQUueLLEYVVtdw8Xor5uhZcujXRkdhNmmW8bb9xAWk6VKyRneJsXHLsDFWcRYVagZpv1a2nD7BejzDiw';

async function main() {
  const decode = typeof bs58.decode === 'function' ? bs58.decode : bs58.default.decode;
  const keypair = Keypair.fromSecretKey(decode(FAUCET_SECRET));
  console.log('Signer:', keypair.publicKey.toBase58());

  const connection = new Connection(RPC, 'confirmed');
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => { tx.sign(keypair); return tx; },
    signAllTransactions: async (txs) => { txs.forEach(tx => tx.sign(keypair)); return txs; },
  };

  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(IDL, provider);

  // --- Find bond_id 0 ---
  const bondId = 0;
  const bondIdBuf = Buffer.alloc(8);
  bondIdBuf.writeBigUInt64LE(BigInt(bondId));
  const [bondStatePDA] = PublicKey.findProgramAddressSync([Buffer.from('bond'), bondIdBuf], PROGRAM_ID);
  console.log('\nbondStatePDA:', bondStatePDA.toBase58());

  const bondState = await program.account.bondState.fetch(bondStatePDA);
  console.log('Bond name:', bondState.name);
  console.log('Bond symbol:', bondState.symbol);
  console.log('Face value:', bondState.faceValue.toNumber() / 1e9, 'SOL');
  console.log('Max supply:', bondState.maxSupply.toNumber());
  console.log('Tokens sold:', bondState.tokensSold.toNumber());
  console.log('Issuer:', bondState.issuer.toBase58());
  console.log('Is matured:', bondState.isMatured);

  const bondMint = bondState.bondMint;
  const bondTokenVault = bondState.bondTokenVault;
  const issuer = bondState.issuer;

  console.log('\nbondMint:', bondMint.toBase58());
  console.log('bondTokenVault:', bondTokenVault.toBase58());

  // Buyer ATA for bond tokens
  const buyerBondAta = await getAssociatedTokenAddress(bondMint, keypair.publicKey, false);
  console.log('buyerBondAta:', buyerBondAta.toBase58());

  // ============================================================
  // TEST 1: buyBond
  // ============================================================
  console.log('\n========== TEST 1: buyBond ==========');
  const buyAmount = 2;
  const expectedCost = bondState.faceValue.toNumber() * buyAmount;
  console.log(`Buying ${buyAmount} bond token(s), cost: ${expectedCost / 1e9} SOL`);

  try {
    const sig = await program.methods
      .buyBond(new BN(buyAmount))
      .accounts({
        bondState: bondStatePDA,
        buyer: keypair.publicKey,
        buyerBondAta,
        issuer,
        bondTokenVault,
        bondMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();
    console.log('buyBond SUCCESS:', sig);
    console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

    // Verify state
    const stateAfter = await program.account.bondState.fetch(bondStatePDA);
    console.log('tokens_sold after buy:', stateAfter.tokensSold.toNumber());
  } catch (e) {
    console.error('buyBond FAILED:', e.message);
    if (e.logs) console.log('Logs:', e.logs);
  }

  // ============================================================
  // TEST 2: depositYield
  // ============================================================
  console.log('\n========== TEST 2: depositYield ==========');
  const yieldAmount = 10_000_000; // 0.01 SOL
  console.log('Depositing yield:', yieldAmount / 1e9, 'SOL');

  try {
    const sig2 = await program.methods
      .depositYield(new BN(yieldAmount))
      .accounts({
        bondState: bondStatePDA,
        issuer: keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();
    console.log('depositYield SUCCESS:', sig2);
    console.log('Explorer: https://explorer.solana.com/tx/' + sig2 + '?cluster=devnet');

    // Verify state
    const stateAfter2 = await program.account.bondState.fetch(bondStatePDA);
    console.log('total_yield_deposited after:', stateAfter2.totalYieldDeposited.toNumber());
  } catch (e) {
    console.error('depositYield FAILED:', e.message);
    if (e.logs) console.log('Logs:', e.logs);
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
