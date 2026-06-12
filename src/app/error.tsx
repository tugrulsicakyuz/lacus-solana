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
    <div className="lx-wrap">
      <div className="lx-pagehead" style={{ textAlign: "center", paddingTop: 120 }}>
        <div className="lx-kicker num">500</div>
        <h1>Something Went Wrong</h1>
        <p className="lx-lede" style={{ margin: "16px auto 0" }}>
          We encountered an unexpected issue. Please try again.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, paddingBottom: 120 }}>
        <button onClick={reset} className="lx-btn lx-btn-solid">Try Again</button>
        <Link href="/" className="lx-btn lx-btn-ghost">Back to Home</Link>
      </div>
    </div>
  );
}
