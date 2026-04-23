'use client';
import Link from 'next/link';
export default function SecondaryMarket() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🔄</span>
        </div>
        <h1 className="text-2xl font-semibold mb-3">Secondary Market</h1>
        <p className="text-slate-400 mb-6">
          Peer-to-peer bond trading is coming to Solana. Bond tokens are standard SPL tokens and can already be traded on any Solana DEX.
        </p>
        <Link href="/primary" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          Go to Primary Market
        </Link>
      </div>
    </div>
  );
}
