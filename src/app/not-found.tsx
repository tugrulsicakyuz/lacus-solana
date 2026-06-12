"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <style>{`
        .nf-root {
          min-height: 100vh;
          background: #0d0b08;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-dm-mono);
        }
        .nf-glow {
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: 40%;
          transform: translate(-50%, -50%);
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,149,42,0.08) 0%, transparent 70%);
          filter: blur(60px);
        }
        .nf-code {
          font-family: var(--font-bebas);
          font-size: clamp(100px, 18vw, 160px);
          letter-spacing: 0.06em;
          color: rgba(201,149,42,0.15);
          line-height: 1;
          margin: 0;
        }
        .nf-title {
          font-family: var(--font-bebas);
          font-size: clamp(28px, 5vw, 42px);
          letter-spacing: 0.12em;
          color: #f0e8d8;
          margin: 8px 0 0;
        }
        .nf-sub {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(240,232,216,0.35);
          margin: 16px 0 40px;
        }
        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 28px;
          border: 1px solid rgba(201,149,42,0.7);
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
        }
        .nf-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background: oklch(0.72 0.14 72);
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .nf-btn:hover { color: #0d0b08; }
        .nf-btn:hover::before { transform: translateY(0); }
        .nf-btn span { position: relative; z-index: 1; }
        .nf-rule {
          width: 48px;
          height: 1px;
          background: linear-gradient(90deg, rgba(201,149,42,0.6), transparent);
          margin: 0 auto 24px;
        }
      `}</style>

      <div className="nf-root">
        <div className="nf-glow" />
        <div style={{ position: "relative", textAlign: "center", padding: "0 24px" }}>
          <p className="nf-code">404</p>
          <div className="nf-rule" />
          <h1 className="nf-title">Page Not Found</h1>
          <p className="nf-sub">The page you're looking for doesn't exist or has moved</p>
          <Link href="/" className="nf-btn">
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </>
  );
}
