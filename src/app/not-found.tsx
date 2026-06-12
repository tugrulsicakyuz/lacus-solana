"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="lx-wrap">
      <div className="lx-pagehead" style={{ textAlign: "center", paddingTop: 120 }}>
        <div className="lx-kicker num">404</div>
        <h1>Page Not Found</h1>
        <p className="lx-lede" style={{ margin: "16px auto 0" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 36, paddingBottom: 120 }}>
        <Link href="/" className="lx-btn lx-btn-solid">Back to Home</Link>
      </div>
    </div>
  );
}
