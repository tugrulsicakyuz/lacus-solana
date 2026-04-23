import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// Devnet USDC mint
const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

async function mintUSDC() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load your wallet keypair
  const walletPath = path.join(process.env.HOME || '', '.config', 'solana', 'id.json');
  
  if (!fs.existsSync(walletPath)) {
    console.error('❌ Wallet not found at:', walletPath);
    console.log('\nTo create a wallet, run: solana-keygen new');
    process.exit(1);
  }
  
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 Wallet:', payer.publicKey.toString());
  
  // Get or create token account
  console.log('📦 Getting USDC token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    USDC_MINT,
    payer.publicKey
  );
  
  console.log('💰 Token Account:', tokenAccount.address.toString());
  
  // Amount to mint (1000 USDC with 6 decimals)
  const amount = 1000 * 1_000_000; // 1000 USDC
  
  try {
    console.log('🔨 Minting USDC...');
    const signature = await mintTo(
      connection,
      payer,
      USDC_MINT,
      tokenAccount.address,
      payer, // mint authority (this will likely fail unless you have authority)
      amount
    );
    
    console.log('✅ Success! Signature:', signature);
    console.log('🎉 Minted 1000 USDC to your wallet');
  } catch (error: any) {
    console.error('❌ Mint failed:', error.message);
    console.log('\n⚠️  You need mint authority for this token.');
    console.log('💡 Try using SPL Token Faucet instead:');
    console.log('   https://spl-token-faucet.com/');
  }
}

mintUSDC();
