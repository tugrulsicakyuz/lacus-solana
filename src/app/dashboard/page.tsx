'use client';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">📊</span>
        </div>
        <h1 className="text-2xl font-semibold mb-3">Portfolio</h1>
        {!connected ? (
          <><p className="text-slate-400 mb-6">Connect your Solana wallet to view your bond holdings.</p><WalletMultiButton style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} /></>
        ) : (
          <><p className="text-slate-400 mb-2">Connected: {publicKey?.toBase58().slice(0,8)}...</p><p className="text-slate-500 text-sm mb-6">Your bond tokens are visible in any Solana wallet.</p><Link href="/launchpad" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">Browse Bonds</Link></>
        )}
      </div>
    </div>
  );
}
