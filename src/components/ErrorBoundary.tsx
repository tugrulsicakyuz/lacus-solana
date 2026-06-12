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
        <div style={{
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px",
          textAlign: "center",
          border: "1px solid rgba(251,113,133,0.15)",
          background: "rgba(251,113,133,0.03)",
        }}>
          <p style={{ fontFamily: "var(--font-bebas)", fontSize: 48, letterSpacing: "0.06em", color: "rgba(251,113,133,0.25)" }}>!</p>
          <p style={{ fontFamily: "var(--font-bebas)", fontSize: 22, letterSpacing: "0.1em", color: "#f0e8d8", margin: "8px 0" }}>
            Section Failed to Load
          </p>
          <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(240,232,216,0.35)", maxWidth: 320, lineHeight: 1.7, marginBottom: 24 }}>
            An unexpected error occurred. Refresh the page or return home.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ padding: "8px 20px", border: "1px solid rgba(251,113,133,0.5)", color: "#fb7185", background: "none", cursor: "pointer", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-mono)" }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{ display: "inline-flex", alignItems: "center", padding: "8px 20px", border: "1px solid rgba(240,232,216,0.14)", color: "rgba(240,232,216,0.5)", textDecoration: "none", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-dm-mono)" }}
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
