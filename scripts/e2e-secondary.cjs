// Uctan uca IKINCIL PIYASA testi (devnet). Akis:
//  issue -> seller buy -> funded (withdraw) -> deposit_yield
//  -> list_units -> buy_listing (buyer2) -> cancel_listing
// Birim hareketi, SOL akisi, listing hesabinin acilip kapanmasi dogrulanir.
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

  const seller = Keypair.generate(); // birinci alici, sonra satici
  const buyer2 = Keypair.generate(); // ikincil piyasada alici
  console.log('programId:', PID.toBase58());
  console.log('issuer   :', issuer.publicKey.toBase58());
  console.log('seller   :', seller.publicKey.toBase58());
  console.log('buyer2   :', buyer2.publicKey.toBase58());

  // seller + buyer2'ye SOL gonder
  {
    const tx = new anchor.web3.Transaction()
      .add(SystemProgram.transfer({ fromPubkey: issuer.publicKey, toPubkey: seller.publicKey, lamports: 0.12 * LAMPORTS_PER_SOL }))
      .add(SystemProgram.transfer({ fromPubkey: issuer.publicKey, toPubkey: buyer2.publicKey, lamports: 0.12 * LAMPORTS_PER_SOL }));
    await provider.sendAndConfirm(tx, []);
  }

  const [factoryPda] = PublicKey.findProgramAddressSync([Buffer.from('factory')], PID);
  const factory = await program.account.factoryState.fetch(factoryPda);
  const bondId = factory.bondCount.toNumber();
  console.log('next bondId:', bondId, 'feeRecipient(authority):', factory.authority.toBase58());

  const [bondPda] = PublicKey.findProgramAddressSync([Buffer.from('bond'), u64le(bondId)], PID);
  const [escrowPda] = PublicKey.findProgramAddressSync([Buffer.from('escrow'), u64le(bondId)], PID);
  const [yieldPda] = PublicKey.findProgramAddressSync([Buffer.from('yield'), u64le(bondId)], PID);
  const [sellerPos] = PublicKey.findProgramAddressSync([Buffer.from('position'), bondPda.toBuffer(), seller.publicKey.toBuffer()], PID);
  const [buyer2Pos] = PublicKey.findProgramAddressSync([Buffer.from('position'), bondPda.toBuffer(), buyer2.publicKey.toBuffer()], PID);
  const [listingPda] = PublicKey.findProgramAddressSync([Buffer.from('listing'), bondPda.toBuffer(), seller.publicKey.toBuffer()], PID);

  const now = Math.floor(Date.now() / 1000);
  const FACE = 10_000_000; // 0.01 SOL/birim
  const params = {
    name: 'Sec Test', symbol: 'SECT', faceValue: new BN(FACE), couponRateBps: 1000,
    saleDeadline: new BN(now + 10), maturityTimestamp: new BN(now + 600), // genis trade penceresi
    fundingGoal: new BN(FACE * 4), maxSupply: new BN(10), loanAgreementHash: Array(32).fill(7),
  };

  console.log('\n[1] issue_bond');
  await program.methods.issueBond(params).accounts({
    issuer: issuer.publicKey, factoryState: factoryPda, bondState: bondPda, systemProgram: SystemProgram.programId,
  }).rpc();

  console.log('[2] seller buy 4 units (0.04 SOL) -> escrow');
  await program.methods.buyBond(new BN(4)).accounts({
    bondState: bondPda, escrowVault: escrowPda, buyer: seller.publicKey, investorPosition: sellerPos, systemProgram: SystemProgram.programId,
  }).signers([seller]).rpc();
  let sp = await program.account.investorPosition.fetch(sellerPos);
  console.log('    seller units =', sp.units.toString(), 'contribution =', sol(sp.contribution.toNumber()));

  console.log('    ...sale deadline bekleniyor...');
  while (Math.floor(Date.now() / 1000) < now + 11) await sleep(1000);

  console.log('[3] withdraw_escrow -> funded');
  await program.methods.withdrawEscrow().accounts({
    bondState: bondPda, factoryState: factoryPda, escrowVault: escrowPda, issuer: issuer.publicKey, feeRecipient: factory.authority, systemProgram: SystemProgram.programId,
  }).rpc();
  let bond = await program.account.bondState.fetch(bondPda);
  console.log('    funded =', bond.funded);

  console.log('[4] deposit_yield 0.004 SOL');
  await program.methods.depositYield(new BN(4_000_000)).accounts({
    bondState: bondPda, yieldVault: yieldPda, issuer: issuer.publicKey, systemProgram: SystemProgram.programId,
  }).rpc();

  console.log('\n[5] list_units: seller 2 birimi 0.012 SOL/birim fiyatla listeler');
  const sellerBefore = await connection.getBalance(seller.publicKey);
  await program.methods.listUnits(new BN(2), new BN(12_000_000)).accounts({
    bondState: bondPda, yieldVault: yieldPda, seller: seller.publicKey, investorPosition: sellerPos, listing: listingPda, systemProgram: SystemProgram.programId,
  }).signers([seller]).rpc();
  const listing = await program.account.listing.fetch(listingPda);
  sp = await program.account.investorPosition.fetch(sellerPos);
  const sellerAfterList = await connection.getBalance(seller.publicKey);
  console.log('    listing.units =', listing.units.toString(), 'price/unit =', sol(listing.pricePerUnit.toNumber()), 'active =', listing.active);
  console.log('    seller position units =', sp.units.toString(), '(beklenen 2)');
  console.log('    seller accrued settle (delta, rent dusulu) ~', sol(sellerAfterList - sellerBefore), 'SOL');
  if (sp.units.toNumber() !== 2) throw new Error('FAIL: seller units != 2 after list');

  console.log('\n[6] buy_listing: buyer2 ilani satin alir');
  const sellerBeforeBuy = await connection.getBalance(seller.publicKey);
  const feeRecBefore = await connection.getBalance(factory.authority);
  await program.methods.buyListing().accounts({
    bondState: bondPda, factoryState: factoryPda, listing: listingPda, seller: seller.publicKey,
    buyer: buyer2.publicKey, buyerPosition: buyer2Pos, feeRecipient: factory.authority, systemProgram: SystemProgram.programId,
  }).signers([buyer2]).rpc();
  const b2 = await program.account.investorPosition.fetch(buyer2Pos);
  const sellerAfterBuy = await connection.getBalance(seller.publicKey);
  const feeRecAfter = await connection.getBalance(factory.authority);
  console.log('    buyer2 units =', b2.units.toString(), '(beklenen 2)  contribution =', sol(b2.contribution.toNumber()));
  console.log('    seller +', sol(sellerAfterBuy - sellerBeforeBuy), 'SOL (fiyat 0.024 + listing rent iadesi)');
  console.log('    feeRecipient +', sol(feeRecAfter - feeRecBefore), 'SOL (beklenen ~%0.25 of 0.024 = 0.00006)');
  let closed = await connection.getAccountInfo(listingPda);
  console.log('    listing account closed =', closed === null, '(beklenen true)');
  if (b2.units.toNumber() !== 2) throw new Error('FAIL: buyer2 units != 2');
  if (closed !== null) throw new Error('FAIL: listing not closed after buy');

  console.log('\n[7] cancel_listing: seller 1 birim listeler sonra iptal eder');
  await program.methods.listUnits(new BN(1), new BN(13_000_000)).accounts({
    bondState: bondPda, yieldVault: yieldPda, seller: seller.publicKey, investorPosition: sellerPos, listing: listingPda, systemProgram: SystemProgram.programId,
  }).signers([seller]).rpc();
  sp = await program.account.investorPosition.fetch(sellerPos);
  console.log('    list sonrasi seller units =', sp.units.toString(), '(beklenen 1)');
  await program.methods.cancelListing().accounts({
    bondState: bondPda, investorPosition: sellerPos, listing: listingPda, seller: seller.publicKey, systemProgram: SystemProgram.programId,
  }).signers([seller]).rpc();
  sp = await program.account.investorPosition.fetch(sellerPos);
  closed = await connection.getAccountInfo(listingPda);
  console.log('    cancel sonrasi seller units =', sp.units.toString(), '(beklenen 2)  listing closed =', closed === null);
  if (sp.units.toNumber() !== 2) throw new Error('FAIL: seller units != 2 after cancel');

  console.log('\n=== SECONDARY E2E TAMAM (list + buy + cancel) ===');
})().catch((e) => { console.error('FATAL:', e.error?.errorCode?.code || e.message || e); process.exit(1); });
