"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-slate-950 min-h-screen flex items-center justify-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="relative mx-auto flex max-w-lg flex-col items-center px-4 text-center">
        <p className="text-8xl font-extrabold tracking-tight text-blue-500/30">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Page Not Found
        </h1>
        <p className="mt-3 text-base text-slate-400">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:bg-blue-400 hover:shadow-blue-500/30 active:scale-[0.97]"
        >
          Back to Home
        </Link>
      </div>
    </section>
  );
}
