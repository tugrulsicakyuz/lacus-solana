import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

async function createTestUSDC() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load your wallet keypair
  const walletPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found. Run: solana-keygen new');
    process.exit(1);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 Wallet:', payer.publicKey.toString());
  
  // Create a new token mint (your own USDC for testing)
  console.log('🏭 Creating test USDC token...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    null, // freeze authority
    6 // decimals (USDC uses 6)
  );
  
  console.log('✅ Test USDC Mint:', mint.toString());
  
  // Get or create token account
  console.log('📦 Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  
  console.log('💰 Token Account:', tokenAccount.address.toString());
  
  // Mint 10,000 test USDC
  const amount = 10_000 * 1_000_000; // 10,000 USDC
  
  console.log('🔨 Minting 10,000 test USDC...');
  const signature = await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer, // you are the mint authority
    amount
  );
  
  console.log('✅ Success! Signature:', signature);
  console.log('\n🎉 You now have 10,000 test USDC!');
  console.log('\n📝 Update your .env file:');
  console.log(`NEXT_PUBLIC_USDC_MINT=${mint.toString()}`);
  console.log('\n⚠️  Remember: This is YOUR test token, not the real devnet USDC!');
}

createTestUSDC();
