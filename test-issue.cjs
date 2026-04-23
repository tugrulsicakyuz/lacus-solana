// Test issueBond directly without Phantom
// Run: node test-issue.cjs

const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program, BN, setProvider } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');
const IDL = require('./src/lib/lacus-idl.json');

const PROGRAM_ID = new PublicKey('Fnw9tWvwyMXieH35WhFfDz7behbDo1teBrVJZ4pZq7rL');
const RPC = 'https://api.devnet.solana.com';

const FAUCET_SECRET = '57QZjzV2WQUueLLEYVVtdw8Xor5uhZcujXRkdhNmmW8bb9xAWk6VKyRneJsXHLsDFWcRYVagZpv1a2nD7BejzDiw';

async function main() {
  const secretKey = typeof bs58.decode === 'function'
    ? bs58.decode(FAUCET_SECRET)
    : bs58.default.decode(FAUCET_SECRET);
  const keypair = Keypair.fromSecretKey(secretKey);
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

  const { createHash } = require('crypto');
  const hash = createHash('sha256').update('test-bond').digest();
  const loanAgreementHash = Array.from(hash);
  const maturityTimestamp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

  console.log('\nTrying Anchor .rpc() directly...');
  try {
    const maturityTs2 = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const hash2 = createHash('sha256').update('rpc-test').digest();
    const sig = await program.methods
      .issueBond({
        name: 'RPC Test Bond',
        symbol: 'RPCT',
        faceValue: new BN(100_000_000),
        couponRateBps: 800,
        maturityTimestamp: new BN(maturityTs2),
        maxSupply: new BN(1000),
        loanAgreementHash: Array.from(hash2),
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
      .signers([keypair])
      .rpc();
    console.log('RPC SUCCESS:', sig);
    return;
  } catch (e) {
    console.log('RPC failed:', e.message);
    if (e.logs) console.log('RPC logs:', e.logs);
  }

  console.log('\nBuilding Anchor instruction...');

  // Get the instruction (not the full transaction) to inspect account metas
  const ix = await program.methods
    .issueBond({
      name: 'Test Bond',
      symbol: 'TBON',
      faceValue: new BN(100_000_000),
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
    .instruction();

  // DIAGNOSTIC: verify each instruction account vs expected
  const { Connection: Conn2 } = require('@solana/web3.js');
  const conn2 = new Conn2(RPC, 'confirmed');
  console.log('\n=== ACCOUNT OWNER DIAGNOSTIC ===');
  for (let i = 0; i < ix.keys.length; i++) {
    const k = ix.keys[i];
    const info = await conn2.getAccountInfo(k.pubkey);
    const owner = info ? info.owner.toBase58() : 'DOES NOT EXIST';
    console.log(`  ix[${i}] ${k.pubkey.toBase58()} | owner=${owner}`);
  }
  console.log('factoryStatePDA (test var):', factoryStatePDA.toBase58());
  console.log('ix[1] pubkey:', ix.keys[1].pubkey.toBase58());
  console.log('Match?', ix.keys[1].pubkey.toBase58() === factoryStatePDA.toBase58());

  console.log('\n=== INSTRUCTION ACCOUNT METAS ===');
  ix.keys.forEach((key, i) => {
    console.log(`  [${i}] ${key.pubkey.toBase58()} | signer=${key.isSigner} | writable=${key.isWritable}`);
  });

  // Build transaction manually
  const tx = new Transaction();
  tx.add(ix);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = keypair.publicKey;
  tx.sign(keypair);

  const msg = tx.compileMessage();
  // Print raw instruction account indices
  const compiledMsg = tx.compileMessage();
  const compiledIx = compiledMsg.instructions[0];
  console.log('\n=== RAW INSTRUCTION INDICES ===');
  console.log('Program index:', compiledIx.programIdIndex);
  console.log('Account indices (maps ix position → message account):');
  Array.from(compiledIx.accounts).forEach((msgIdx, ixPos) => {
    const isSigner = msgIdx < compiledMsg.header.numRequiredSignatures;
    const pubkey = compiledMsg.accountKeys[msgIdx].toBase58();
    console.log(`  ix[${ixPos}] → msg[${msgIdx}] (${pubkey}) | signer=${isSigner}`);
  });

  console.log('\n=== TX MESSAGE ===');
  console.log('numRequiredSignatures:', msg.header.numRequiredSignatures);
  console.log('numReadonlySignedAccounts:', msg.header.numReadonlySignedAccounts);
  console.log('Account keys:');
  msg.accountKeys.forEach((k, i) => {
    const isSigner = i < msg.header.numRequiredSignatures;
    console.log(`  [${i}] ${k.toBase58()} | signer=${isSigner}`);
  });

  console.log('\nSending directly (skipPreflight)...');
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  console.log('TX submitted:', sig);
  console.log('Explorer: https://explorer.solana.com/tx/' + sig + '?cluster=devnet');

  // Wait then fetch result
  console.log('Waiting 8s for confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  const txInfo = await connection.getTransaction(sig, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!txInfo) {
    console.log('TX not found yet — check explorer manually');
  } else if (txInfo.meta?.err) {
    console.log('ON-CHAIN ERROR:', JSON.stringify(txInfo.meta.err));
    console.log('Logs:');
    (txInfo.meta.logMessages || []).forEach(l => console.log(' ', l));
  } else {
    console.log('SUCCESS! Bond issued. bond_id:', bondId);
    console.log('Logs:');
    (txInfo.meta?.logMessages || []).forEach(l => console.log(' ', l));
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
