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
    <>
      <style>{`
        .err-root {
          min-height: 100vh;
          background: #0d0b08;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-dm-mono);
        }
        .err-glow {
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: 40%;
          transform: translate(-50%, -50%);
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251,113,133,0.07) 0%, transparent 70%);
          filter: blur(60px);
        }
        .err-code {
          font-family: var(--font-bebas);
          font-size: clamp(100px, 18vw, 160px);
          letter-spacing: 0.06em;
          color: rgba(251,113,133,0.15);
          line-height: 1;
          margin: 0;
        }
        .err-title {
          font-family: var(--font-bebas);
          font-size: clamp(28px, 5vw, 42px);
          letter-spacing: 0.12em;
          color: #f0e8d8;
          margin: 8px 0 0;
        }
        .err-sub {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.35);
          margin: 16px 0 40px;
        }
        .err-rule {
          width: 48px;
          height: 1px;
          background: linear-gradient(90deg, rgba(251,113,133,0.6), transparent);
          margin: 0 auto 24px;
        }
        .err-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 28px;
          border: 1px solid rgba(251,113,133,0.7);
          color: #f0e8d8;
          text-decoration: none;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: color 0.3s;
          font-family: var(--font-dm-mono);
          background: none;
        }
        .err-btn-primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: #fb7185;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .err-btn-primary:hover { color: #0d0b08; }
        .err-btn-primary:hover::before { transform: translateY(0); }
        .err-btn-primary span { position: relative; z-index: 1; }
        .err-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 28px;
          border: 1px solid rgba(240,232,216,0.15);
          color: rgba(240,232,216,0.45);
          text-decoration: none;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.3s, border-color 0.3s;
          font-family: var(--font-dm-mono);
          background: none;
        }
        .err-btn-ghost:hover {
          color: #f0e8d8;
          border-color: rgba(240,232,216,0.35);
        }
        .err-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>

      <div className="err-root">
        <div className="err-glow" />
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          <p className="err-code">500</p>
          <div className="err-rule" />
          <h1 className="err-title">Something Went Wrong</h1>
          <p className="err-sub">We encountered an unexpected issue — please try again</p>
          <div className="err-actions">
            <button onClick={reset} className="err-btn-primary">
              <span>Try Again</span>
            </button>
            <Link href="/" className="err-btn-ghost">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
