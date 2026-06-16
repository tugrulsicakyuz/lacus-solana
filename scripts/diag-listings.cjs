const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair } = require('@solana/web3.js');
const fs = require('fs'), os = require('os'), path = require('path');
const idl = require(path.join(__dirname, '..', 'src', 'lib', 'lacus-idl.json'));
const PROGRAMS = {
  'NEW 9NYAKS (frontend su an buna bakiyor)': '9NYAKSppmqJgBPmrKq5zqudEsURvbjSm6Tb4BxCZMS8S',
  'OLD BdRJSx (upgrade edilmis eski program)': 'BdRJSxsqbQZ12xuM9dcEQXuQ9R8AHvfTfMq6EppmEUoH',
};
(async () => {
  const secret = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'solana', 'id.json')));
  const kp = Keypair.fromSecretKey(new Uint8Array(secret));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(kp), { commitment: 'confirmed' });
  for (const [label, pid] of Object.entries(PROGRAMS)) {
    const program = new anchor.Program({ ...idl, address: pid }, provider);
    let bonds = [], listings = [];
    try { bonds = await program.account.bondState.all(); } catch (e) { console.log(label, 'bondState err:', e.message); }
    try { listings = await program.account.listing.all(); } catch (e) { console.log(label, 'listing err:', e.message); }
    console.log(`\n=== ${label} ===`);
    console.log('BONDS:', bonds.length);
    bonds.forEach(b => console.log('   id', Number(b.account.bondId), b.account.symbol, '| funded', b.account.funded, '| sold', Number(b.account.tokensSold), '/', Number(b.account.maxSupply), '| issuer', b.account.issuer.toBase58().slice(0,8)));
    console.log('LISTINGS:', listings.length);
    listings.forEach(l => console.log('   seller', l.account.seller.toBase58().slice(0,8), '| units', Number(l.account.units), '| price', Number(l.account.pricePerUnit)/1e9, 'SOL | active', l.account.active, '| bondState', l.account.bondState.toBase58().slice(0,8)));
  }
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
