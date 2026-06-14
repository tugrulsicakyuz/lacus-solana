// Factory'yi baslatir. authority = bu makinedeki CLI cuzdani (~/.config/solana/id.json).
// Yeni kontratta initialize_factory parametre almaz; authority = signer olur.
// Fee aliciyi sonradan degistirmek icin: program.methods.setAuthority(yeniPubkey).
const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair, PublicKey, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

const idl = require(path.join(__dirname, '..', 'src', 'lib', 'lacus-idl.json'));

(async () => {
  const secret = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'solana', 'id.json'), 'utf8'));
  const kp = Keypair.fromSecretKey(new Uint8Array(secret));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new anchor.Wallet(kp);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  console.log('programId :', program.programId.toBase58());
  console.log('wallet    :', wallet.publicKey.toBase58());

  const [factoryPda] = PublicKey.findProgramAddressSync([Buffer.from('factory')], program.programId);
  console.log('factoryPDA:', factoryPda.toBase58());

  const existing = await connection.getAccountInfo(factoryPda);
  if (existing) {
    const f = await program.account.factoryState.fetch(factoryPda);
    console.log('ALREADY INITIALIZED -> authority:', f.authority.toBase58(), 'bond_count:', f.bondCount.toString());
    return;
  }

  const sig = await program.methods
    .initializeFactory()
    .accounts({
      factoryState: factoryPda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log('initialize_factory sig:', sig);

  const f = await program.account.factoryState.fetch(factoryPda);
  console.log('authority :', f.authority.toBase58());
  console.log('bond_count:', f.bondCount.toString());
})().catch((e) => { console.error('ERR:', e.message || e); process.exit(1); });
