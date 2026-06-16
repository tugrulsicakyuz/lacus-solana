const anchor = require('@coral-xyz/anchor');
const { Connection, Keypair } = require('@solana/web3.js');
const fs=require('fs'),os=require('os'),path=require('path');
const idl=require(path.join(__dirname,'..','src','lib','lacus-idl.json'));
(async()=>{
  const secret=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.config','solana','id.json')));
  const provider=new anchor.AnchorProvider(new Connection('https://api.devnet.solana.com','confirmed'),new anchor.Wallet(Keypair.fromSecretKey(new Uint8Array(secret))),{commitment:'confirmed'});
  const program=new anchor.Program({...idl,address:'9NYAKSppmqJgBPmrKq5zqudEsURvbjSm6Tb4BxCZMS8S'},provider);
  const bonds=await program.account.bondState.all();
  const byPda={}; bonds.forEach(b=>byPda[b.publicKey.toBase58()]={id:Number(b.account.bondId),sym:b.account.symbol,funded:b.account.funded,mat:Number(b.account.maturityTimestamp)});
  const positions=await program.account.investorPosition.all();
  const now=Math.floor(Date.now()/1000);
  console.log('9NYAKS positions:',positions.length);
  positions.forEach(p=>{
    const b=byPda[p.account.bondState.toBase58()]||{};
    console.log('   investor',p.account.investor.toBase58().slice(0,8),'| bond',b.sym,'(id',b.id+')','| units',Number(p.account.units),'| funded',b.funded,'| matured',b.mat<=now,'| redeemed',p.account.redeemed,'refunded',p.account.refunded);
  });
})().catch(e=>{console.error('ERR',e.message||e)});
