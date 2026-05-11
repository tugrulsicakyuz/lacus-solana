import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const PROGRAM_ID = new PublicKey('87fieWCffnauPhnHHM5TFqtRPNTcvup3VGUiW6Vae3PQ');
const DEVNET_RPC = 'https://api.devnet.solana.com';

const DEMO_BONDS = [
  {
    name: 'Lacus Corp Bond',
    symbol: 'LCB',
    faceValueSOL: 0.1,
    couponRateBps: 800,  // 8% APY
    maturityDays: 365,
    maxSupply: 100,
  },
  {
    name: 'GreenBuild DAO',
    symbol: 'GBD',
    faceValueSOL: 0.05,
    couponRateBps: 1000, // 10% APY
    maturityDays: 180,
    maxSupply: 200,
  },
  {
    name: 'Nexus Ventures',
    symbol: 'NXV',
    faceValueSOL: 0.2,
    couponRateBps: 1200, // 12% APY
    maturityDays: 730,
    maxSupply: 50,
  },
];

async function main() {
  const keyPath = path.join(os.homedir(), '.config/solana/id.json');
  const rawKey = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(rawKey));

  const connection = new anchor.web3.Connection(DEVNET_RPC, 'confirmed');
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync('./src/lib/lacus-idl.json', 'utf-8'));
  const program = new Program(idl, provider);

  const [factoryStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('factory')],
    PROGRAM_ID
  );

  const factoryState = await (program.account as any).factoryState.fetch(factoryStatePDA);
  console.log(`Factory bond count: ${factoryState.bondCount.toString()}`);
  console.log(`Issuer: ${payer.publicKey.toBase58()}`);

  for (const bond of DEMO_BONDS) {
    const bondCount = (await (program.account as any).factoryState.fetch(factoryStatePDA)).bondCount;
    const bondIdBuf = Buffer.alloc(8);
    bondIdBuf.writeBigUInt64LE(BigInt(bondCount.toString()));

    const [bondStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bond'), bondIdBuf],
      PROGRAM_ID
    );
    const [bondMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), bondStatePDA.toBuffer()],
      PROGRAM_ID
    );
    const bondTokenVault = await getAssociatedTokenAddress(bondMintPDA, bondStatePDA, true);

    const faceValue = new anchor.BN(Math.round(bond.faceValueSOL * 1_000_000_000));
    const maturityTs = new anchor.BN(Math.floor(Date.now() / 1000) + bond.maturityDays * 86400);
    const loanHash = Array.from(crypto.randomBytes(32));

    console.log(`\nIssuing: ${bond.name} (${bond.symbol})`);
    console.log(`  Face value: ${bond.faceValueSOL} SOL | APY: ${bond.couponRateBps / 100}% | Supply: ${bond.maxSupply}`);

    const tx = await (program.methods as any)
      .issueBond({
        name: bond.name,
        symbol: bond.symbol,
        faceValue,
        couponRateBps: bond.couponRateBps,
        maturityTimestamp: maturityTs,
        maxSupply: new anchor.BN(bond.maxSupply),
        loanAgreementHash: loanHash,
      })
      .accounts({
        issuer: payer.publicKey,
        factoryState: factoryStatePDA,
        bondState: bondStatePDA,
        bondMint: bondMintPDA,
        bondTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log(`  TX: ${tx}`);
    console.log(`  Bond ID: ${bondCount.toString()}`);
  }

  console.log('\nAll demo bonds issued successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
