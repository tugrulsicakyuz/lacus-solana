// Uctan uca guvenlik/akis testi (devnet). Kisa zamanlayicilarla tum yasam dongusu.
const anchor = require('@coral-xyz/anchor');
const { BN } = anchor;
const { Connection, Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

const idl = require(path.join(__dirname, '..', 'src', 'lib', 'lacus-idl.json'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sol = (n) => (n / LAMPORTS_PER_SOL).toFixed(6);

function u64le(n) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; }

(async () => {
  const secret = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'solana', 'id.json'), 'utf8'));
  const issuer = Keypair.fromSecretKey(new Uint8Array(secret));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(issuer), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  const PID = program.programId;

  // Ayri bir buyer cuzdani
  const buyer = Keypair.generate();
  console.log('issuer:', issuer.publicKey.toBase58());
  console.log('buyer :', buyer.publicKey.toBase58());

  // buyer'a SOL gonder
  {
    const tx = new anchor.web3.Transaction().add(SystemProgram.transfer({
      fromPubkey: issuer.publicKey, toPubkey: buyer.publicKey, lamports: 0.5 * LAMPORTS_PER_SOL,
    }));
    await provider.sendAndConfirm(tx, []);
  }

  const [factoryPda] = PublicKey.findProgramAddressSync([Buffer.from('factory')], PID);
  const factory = await program.account.factoryState.fetch(factoryPda);
  const bondId = factory.bondCount.toNumber();
  console.log('next bondId:', bondId, 'authority(feeRecipient):', factory.authority.toBase58());

  const [bondPda] = PublicKey.findProgramAddressSync([Buffer.from('bond'), u64le(bondId)], PID);
  const [escrowPda] = PublicKey.findProgramAddressSync([Buffer.from('escrow'), u64le(bondId)], PID);
  const [yieldPda] = PublicKey.findProgramAddressSync([Buffer.from('yield'), u64le(bondId)], PID);
  const [principalPda] = PublicKey.findProgramAddressSync([Buffer.from('principal'), u64le(bondId)], PID);
  const [posPda] = PublicKey.findProgramAddressSync([Buffer.from('position'), bondPda.toBuffer(), buyer.publicKey.toBuffer()], PID);

  const now = Math.floor(Date.now() / 1000);
  const FACE = 10_000_000; // 0.01 SOL / birim
  const params = {
    name: 'Test Bond', symbol: 'TBOND', faceValue: new BN(FACE), couponRateBps: 500,
    saleDeadline: new BN(now + 12), maturityTimestamp: new BN(now + 26),
    fundingGoal: new BN(FACE), maxSupply: new BN(10), loanAgreementHash: Array(32).fill(1),
  };

  console.log('\n[1] issue_bond');
  await program.methods.issueBond(params).accounts({
    issuer: issuer.publicKey, factoryState: factoryPda, bondState: bondPda, systemProgram: SystemProgram.programId,
  }).rpc();
  let bond = await program.account.bondState.fetch(bondPda);
  console.log('    bond created. funded=', bond.funded, 'maxSupply=', bond.maxSupply.toString());

  console.log('\n[2] buy_bond (2 birim = 0.02 SOL) -> escrow');
  await program.methods.buyBond(new BN(2)).accounts({
    bondState: bondPda, escrowVault: escrowPda, buyer: buyer.publicKey,
    investorPosition: posPda, systemProgram: SystemProgram.programId,
  }).signers([buyer]).rpc();
  let escrowBal = await connection.getBalance(escrowPda);
  let pos = await program.account.investorPosition.fetch(posPda);
  bond = await program.account.bondState.fetch(bondPda);
  console.log('    escrow balance =', sol(escrowBal), 'SOL  (beklenen ~0.02)');
  console.log('    position units =', pos.units.toString(), 'contribution =', sol(pos.contribution.toNumber()));
  console.log('    tokensSold =', bond.tokensSold.toString(), 'totalRaised =', sol(bond.totalRaised.toNumber()));

  console.log('\n[3] GUARD: vade dolmadan withdraw_escrow REDDEDILMELI');
  try {
    await program.methods.withdrawEscrow().accounts({
      bondState: bondPda, factoryState: factoryPda, escrowVault: escrowPda,
      issuer: issuer.publicKey, feeRecipient: factory.authority, systemProgram: SystemProgram.programId,
    }).rpc();
    console.log('    HATA: withdraw erken gecti (beklenmiyordu)');
  } catch (e) {
    console.log('    OK reddedildi:', (e.error?.errorCode?.code) || (e.message||'').slice(0, 60));
  }

  console.log('\n    ...sale deadline bekleniyor...');
  while (Math.floor(Date.now()/1000) < now + 13) await sleep(1000);

  console.log('\n[4] GUARD: deadline sonrasi buy REDDEDILMELI');
  try {
    await program.methods.buyBond(new BN(1)).accounts({
      bondState: bondPda, escrowVault: escrowPda, buyer: buyer.publicKey,
      investorPosition: posPda, systemProgram: SystemProgram.programId,
    }).signers([buyer]).rpc();
    console.log('    HATA: deadline sonrasi buy gecti (beklenmiyordu)');
  } catch (e) {
    console.log('    OK reddedildi:', (e.error?.errorCode?.code) || (e.message||'').slice(0, 60));
  }

  console.log('\n[5] withdraw_escrow -> issuer + %1 fee (feeRecipient=authority)');
  const feeRecBefore = await connection.getBalance(factory.authority);
  await program.methods.withdrawEscrow().accounts({
    bondState: bondPda, factoryState: factoryPda, escrowVault: escrowPda,
    issuer: issuer.publicKey, feeRecipient: factory.authority, systemProgram: SystemProgram.programId,
  }).rpc();
  bond = await program.account.bondState.fetch(bondPda);
  escrowBal = await connection.getBalance(escrowPda);
  console.log('    funded =', bond.funded, ' escrow drained =', sol(escrowBal), 'SOL (beklenen ~0)');
  console.log('    beklenen fee = %1 of 0.02 =', sol(0.0002 * LAMPORTS_PER_SOL), 'SOL (authority=issuer oldugu icin net gozlem zor)');

  console.log('\n[6] deposit_yield 0.001 + deposit_principal 0.02 (>= totalRaised)');
  await program.methods.depositYield(new BN(1_000_000)).accounts({
    bondState: bondPda, yieldVault: yieldPda, issuer: issuer.publicKey, systemProgram: SystemProgram.programId,
  }).rpc();
  await program.methods.depositPrincipal(new BN(FACE * 2)).accounts({
    bondState: bondPda, principalVault: principalPda, issuer: issuer.publicKey, systemProgram: SystemProgram.programId,
  }).rpc();
  bond = await program.account.bondState.fetch(bondPda);
  console.log('    yield vault =', sol(await connection.getBalance(yieldPda)));
  console.log('    principal vault =', sol(await connection.getBalance(principalPda)), ' principalFunded =', bond.principalFunded);

  console.log('\n[7] claim_yield (entitled = 0.001 * 2/2 = 0.001)');
  const bBefore = await connection.getBalance(buyer.publicKey);
  await program.methods.claimYield().accounts({
    bondState: bondPda, yieldVault: yieldPda, investor: buyer.publicKey, investorPosition: posPda, systemProgram: SystemProgram.programId,
  }).signers([buyer]).rpc();
  let bAfter = await connection.getBalance(buyer.publicKey);
  pos = await program.account.investorPosition.fetch(posPda);
  console.log('    buyer +', sol(bAfter - bBefore), 'SOL  yieldClaimed =', sol(pos.yieldClaimed.toNumber()));

  console.log('\n[8] K-1 FIX: ikinci claim_yield REDDEDILMELI (NothingToClaim)');
  try {
    await program.methods.claimYield().accounts({
      bondState: bondPda, yieldVault: yieldPda, investor: buyer.publicKey, investorPosition: posPda, systemProgram: SystemProgram.programId,
    }).signers([buyer]).rpc();
    console.log('    HATA: ikinci claim gecti (cift talep acigi!)');
  } catch (e) {
    console.log('    OK reddedildi:', (e.error?.errorCode?.code) || (e.message||'').slice(0, 60));
  }

  console.log('\n[9] GUARD: vade dolmadan redeem REDDEDILMELI');
  try {
    await program.methods.redeemBond().accounts({
      bondState: bondPda, principalVault: principalPda, investor: buyer.publicKey, investorPosition: posPda, systemProgram: SystemProgram.programId,
    }).signers([buyer]).rpc();
    console.log('    HATA: erken redeem gecti');
  } catch (e) {
    console.log('    OK reddedildi:', (e.error?.errorCode?.code) || (e.message||'').slice(0, 60));
  }

  console.log('\n    ...maturity bekleniyor...');
  while (Math.floor(Date.now()/1000) < now + 27) await sleep(1000);

  console.log('\n[10] redeem_bond -> buyer anaparasini (0.02) geri alir');
  const rBefore = await connection.getBalance(buyer.publicKey);
  await program.methods.redeemBond().accounts({
    bondState: bondPda, principalVault: principalPda, investor: buyer.publicKey, investorPosition: posPda, systemProgram: SystemProgram.programId,
  }).signers([buyer]).rpc();
  const rAfter = await connection.getBalance(buyer.publicKey);
  pos = await program.account.investorPosition.fetch(posPda);
  console.log('    buyer +', sol(rAfter - rBefore), 'SOL (beklenen ~0.02)  redeemed =', pos.redeemed);

  console.log('\n[11] cift redeem REDDEDILMELI (AlreadyRedeemed)');
  try {
    await program.methods.redeemBond().accounts({
      bondState: bondPda, principalVault: principalPda, investor: buyer.publicKey, investorPosition: posPda, systemProgram: SystemProgram.programId,
    }).signers([buyer]).rpc();
    console.log('    HATA: cift redeem gecti');
  } catch (e) {
    console.log('    OK reddedildi:', (e.error?.errorCode?.code) || (e.message||'').slice(0, 60));
  }

  console.log('\n=== E2E TAMAM ===');
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
