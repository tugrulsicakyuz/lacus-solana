"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Pratik test parası: devnet'te bağlı cüzdana 1 SOL airdrop eder. Kontrata
// dokunmaz; mainnet'te bu buton gizlenir (cluster devnet değilse render etmez).
export default function FaucetButton() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  if (!connected || !publicKey) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      const sig = await connection.requestAirdrop(publicKey, 1_000_000_000); // 1 SOL
      const bh = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      toast.success("1 test SOL airdropped to your wallet.");
    } catch (e) {
      toast.error("Faucet unavailable right now", {
        description:
          e instanceof Error && /429|rate/i.test(e.message)
            ? "Devnet airdrop is rate-limited. Try again in a minute."
            : e instanceof Error
            ? e.message
            : "Try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="lx-btn lx-btn-ghost lx-btn-sm" onClick={onClick} disabled={loading} title="Get 1 devnet SOL to test">
      {loading ? <Loader2 size={12} className="animate-spin" /> : "Get test SOL"}
    </button>
  );
}
