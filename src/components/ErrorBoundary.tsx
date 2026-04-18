"use client";

import React from "react";
import Link from "next/link";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
          <p className="text-4xl font-extrabold text-red-500/30">!</p>
          <h3 className="mt-4 text-lg font-semibold text-slate-200">
            This section failed to load
          </h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            An unexpected error occurred. You can refresh the page or return to the home page.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-blue-500/40 hover:text-blue-400"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
