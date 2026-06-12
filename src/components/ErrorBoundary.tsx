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
        <div className="lx-wrap">
          <div className="lx-empty" style={{ margin: "64px auto", maxWidth: 520 }}>
            <h2 className="lx-subhead">Section Failed to Load</h2>
            <p>An unexpected error occurred. Refresh the page or return home.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="lx-btn lx-btn-solid lx-btn-sm"
              >
                Try Again
              </button>
              <Link href="/" className="lx-btn lx-btn-ghost lx-btn-sm">
                Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
