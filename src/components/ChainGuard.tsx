"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export default function ChainGuard() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (chainId === baseSepolia.id) return null;
  if (!chainId) return null;

  return (
    <div
      style={{
        background: "rgba(239,68,68,0.1)",
        borderBottom: "1px solid rgba(239,68,68,0.25)",
        padding: "8px 16px",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#fca5a5",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#ef4444",
            animation: "pulse 2s infinite",
          }}
        />
        Wrong network detected. Sparrow runs on{" "}
        <strong style={{ color: "#f87171" }}>Base Sepolia</strong>.
      </span>
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isPending}
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 11,
          fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isPending ? "Switching…" : "Switch to Base Sepolia"}
      </button>
    </div>
  );
}
