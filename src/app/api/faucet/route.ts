import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { mintTo, getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import bs58 from 'bs58';

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();

    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Validate environment variables
    const faucetSecretKey = process.env.FAUCET_KEYPAIR_SECRET;
    const usdcMintAddress = process.env.NEXT_PUBLIC_USDC_MINT;
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

    if (!faucetSecretKey) {
      return NextResponse.json({ error: 'Faucet not configured: FAUCET_KEYPAIR_SECRET missing' }, { status: 500 });
    }

    if (!usdcMintAddress) {
      return NextResponse.json({ error: 'USDC mint not configured' }, { status: 500 });
    }

    // Decode the faucet keypair
    let faucetKeypair: Keypair;
    try {
      const secretKey = bs58.decode(faucetSecretKey);
      faucetKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      console.error('Failed to decode faucet keypair:', e);
      return NextResponse.json({ error: 'Invalid faucet keypair configuration' }, { status: 500 });
    }

    // Parse wallet public key
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const usdcMint = new PublicKey(usdcMintAddress);

    // Get associated token address for the wallet
    const walletAta = await getAssociatedTokenAddress(
      usdcMint,
      walletPubkey
    );

    // Create ATA if it doesn't exist (idempotent)
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      faucetKeypair.publicKey, // payer
      walletAta, // ata
      walletPubkey, // owner
      usdcMint // mint
    );

    // Mint 1000 USDC (1_000_000_000 raw units with 6 decimals)
    const amount = 1_000_000_000;

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Create transaction
    const { Transaction } = await import('@solana/web3.js');
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = faucetKeypair.publicKey;
    tx.add(createAtaIx);

    // Sign and send transaction to create ATA
    const ataSig = await connection.sendTransaction(tx, [faucetKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction({
      signature: ataSig,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    // Mint tokens
    const signature = await mintTo(
      connection,
      faucetKeypair, // payer
      usdcMint, // mint
      walletAta, // destination
      faucetKeypair, // mint authority
      amount,
      [],
      { commitment: 'confirmed' }
    );

    return NextResponse.json({ success: true, signature });
  } catch (error) {
    console.error('Faucet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to mint USDC: ${errorMessage}` }, { status: 500 });
  }
}
