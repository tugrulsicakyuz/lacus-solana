const anchor = require('@coral-xyz/anchor');
const { AnchorProvider, Program, setProvider } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const bs58 = require('bs58');
const IDL = require('./src/lib/lacus-idl.json');

const FAUCET_SECRET = '57QZjzV2WQUueLLEYVVtdw8Xor5uhZcujXRkdhNmmW8bb9xAWk6VKyRneJsXHLsDFWcRYVagZpv1a2nD7BejzDiw';

async function main() {
  const decode = typeof bs58.decode === 'function' ? bs58.decode : bs58.default.decode;
  const kp = Keypair.fromSecretKey(decode(FAUCET_SECRET));
  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => { tx.sign(kp); return tx; },
    signAllTransactions: async (txs) => { txs.forEach(t => t.sign(kp)); return txs; },
  };
  const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' });
  setProvider(provider);
  const program = new Program(IDL, provider);
  const PROGRAM_ID = new PublicKey(IDL.address);
  const [factoryPDA] = PublicKey.findProgramAddressSync([Buffer.from('factory')], PROGRAM_ID);
  console.log('Program ID:', IDL.address);
  console.log('Factory PDA:', factoryPDA.toBase58());

  const existing = await conn.getAccountInfo(factoryPDA);
  if (existing && existing.owner.toBase58() === PROGRAM_ID.toBase58()) {
    console.log('Factory already initialized. bond_count:', 
      (await program.account.factoryState.fetch(factoryPDA)).bondCount.toNumber());
    process.exit(0);
  }

  console.log('Initializing factory...');
  const sig = await program.methods
    .initializeFactory(kp.publicKey)
    .accounts({
      factoryState: factoryPDA,
      authority: kp.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([kp])
    .rpc();
  console.log('SUCCESS! sig:', sig);
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
