"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="relative overflow-hidden bg-slate-950 min-h-screen flex items-center justify-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/6 blur-[120px]" />
      <div className="relative mx-auto flex max-w-lg flex-col items-center px-4 text-center">
        <p className="text-8xl font-extrabold tracking-tight text-red-500/20">500</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Something Went Wrong
        </h1>
        <p className="mt-3 text-base text-slate-400">
          We encountered an unexpected issue. Please try again.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:bg-blue-400 hover:shadow-blue-500/30 active:scale-[0.97]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:border-blue-500/50 hover:text-blue-400 active:scale-[0.97]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
