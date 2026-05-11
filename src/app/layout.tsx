import type { Metadata } from "next";
import "./globals.css";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ChainGuard from "@/components/ChainGuard";
import GlobalInteractions from "@/components/GlobalInteractions";
import ConditionalShell from "@/components/ConditionalShell";

export const metadata: Metadata = {
  title: {
    default: "Lacus — Credit markets with luminous depth.",
    template: "%s | Lacus",
  },
  description:
    "Lacus is a Solana-native protocol for tokenizing, trading, and settling fixed-income instruments. A deep, continuous market for on-chain credit — rendered clear.",
  keywords: [
    "RWA",
    "tokenized bonds",
    "DeFi",
    "real world assets",
    "Solana",
    "bond protocol",
    "on-chain credit",
    "structured credit",
    "fixed income",
    "portfolio construction",
  ],
  authors: [{ name: "Lacus" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Lacus",
    title: "Lacus",
    description:
      "Transparent credit infrastructure for tokenized bonds, portfolio construction, and auditable structured products.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lacus",
    description:
      "Transparent credit infrastructure for tokenized bonds, portfolio construction, and auditable structured products.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SolanaWalletProvider>
          <GlobalInteractions />
          <ChainGuard />
          <ConditionalShell>
            <main className="flex-1">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </ConditionalShell>
          <Toaster theme="dark" richColors position="top-right" />
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
