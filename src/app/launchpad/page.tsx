"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useScrollReveal } from "@/lib/useClientInteractions";

interface Bond {
  id: number;
  issuer_name: string;
  symbol: string;
  apy: number;
  maturity_months: number;
  total_issue_size: number;
  price_per_token: number;
  filled_percentage: number;
  documents_complete: boolean;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function LaunchpadPage() {
  useScrollReveal();
  const router = useRouter();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"apy" | "size" | "filled" | "default">("default");
  const [currentPage, setCurrentPage] = useState(1);
  const BONDS_PER_PAGE = 12;

  const fetchBonds = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("bonds")
      .select("*")
      .eq("documents_complete", true)
      .order("id", { ascending: true });
    if (fetchError) { console.error("Failed to fetch bonds:", fetchError); setError(fetchError.message); }
    else setBonds(data as Bond[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBonds(); }, [fetchBonds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  const filteredBonds = bonds
    .filter((bond) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || bond.issuer_name.toLowerCase().includes(q) || bond.symbol.toLowerCase().includes(q);
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "apy") return b.apy - a.apy;
      if (sortBy === "size") return b.total_issue_size - a.total_issue_size;
      if (sortBy === "filled") return b.filled_percentage - a.filled_percentage;
      return a.id - b.id;
    });

  const totalPages = Math.ceil(filteredBonds.length / BONDS_PER_PAGE);
  const paginatedBonds = filteredBonds.slice(
    (currentPage - 1) * BONDS_PER_PAGE,
    currentPage * BONDS_PER_PAGE
  );

  const totalVolume = bonds.reduce((sum, b) => sum + b.total_issue_size, 0);

  return (
    <section className="min-h-screen pt-12 pb-12">
      <div className="max-w-[1280px] mx-auto px-8">
        
        {/* Header */}
        <div className="pt-14 pb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="eyebrow eyebrow-rule mb-5 reveal" style={{ color: "var(--aqua-bright)" }}>
                Bond Markets
              </div>
              <h1
                className="font-display text-[var(--ink)] leading-[0.97] tracking-tight reveal reveal-d1"
                style={{ fontSize: "clamp(2.2rem, 3.5vw, 3.8rem)" }}
              >
                Explore Credit Products
                <br />
                <span className="italic grad-ink-interactive cursor-pointer">on-chain.</span>
              </h1>
              <p className="mt-5 text-[var(--ink3)] text-[1rem] leading-[1.65] max-w-[44ch] reveal reveal-d2">
                Tokenized bonds built for the Lacus protocol — transparent terms, on-chain settlement.
              </p>
            </div>
            <div className="flex gap-3 items-center reveal reveal-d2 flex-shrink-0">
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.70rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  border: "1px solid rgba(125,211,252,0.18)",
                  background: "rgba(125,211,252,0.04)",
                  color: "var(--aqua-bright)",
                }}
              >
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{bonds.length}</span> bonds
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.70rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  border: "1px solid rgba(196,181,253,0.18)",
                  background: "rgba(196,181,253,0.04)",
                  color: "var(--lilac)",
                }}
              >
                {fmtCurrency(totalVolume)} vol.
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 items-center mb-8 flex-wrap reveal reveal-d1">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink4)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search bonds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface)] border border-[var(--rule)] rounded-xl pl-12 pr-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--lilac)]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[var(--surface)] border border-[var(--rule)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none w-40 cursor-pointer focus:border-[var(--lilac)]"
          >
            <option value="default">Sort by Default</option>
            <option value="apy">Highest APY</option>
            <option value="size">Largest Size</option>
            <option value="filled">Fill Rate</option>
          </select>
        </div>

        {/* Bond Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-luminous rounded-2xl p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-[var(--surface)] rounded animate-pulse mb-2" />
                    <div className="h-3 w-16 bg-[var(--surface)] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-9 w-20 bg-[var(--surface)] rounded animate-pulse mb-2" />
                <div className="h-3 w-28 bg-[var(--surface)] rounded animate-pulse mb-5" />
                <div className="flex gap-4 mb-5">
                  <div className="flex-1">
                    <div className="h-2 w-16 bg-[var(--surface)] rounded animate-pulse mb-2" />
                    <div className="h-4 w-12 bg-[var(--surface)] rounded animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 w-16 bg-[var(--surface)] rounded animate-pulse mb-2" />
                    <div className="h-4 w-14 bg-[var(--surface)] rounded animate-pulse" />
                  </div>
                </div>
                <div className="mb-5">
                  <div className="flex justify-between mb-2">
                    <div className="h-2 w-16 bg-[var(--surface)] rounded animate-pulse" />
                    <div className="h-2 w-8 bg-[var(--surface)] rounded animate-pulse" />
                  </div>
                  <div className="h-1 bg-[var(--shore)] rounded-full overflow-hidden">
                    <div className="h-full w-3/5 bg-[var(--surface)] animate-pulse" />
                  </div>
                </div>
                <div className="h-10 w-full bg-[var(--surface)] rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-[var(--coral)]">Failed to load bonds: {error}</p>
            <button
              onClick={() => fetchBonds()}
              className="btn-primary px-6 py-3"
            >
              Try again
            </button>
          </div>
        ) : filteredBonds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-[var(--ink3)]">
              {bonds.length === 0 ? "No active bond offerings at this time." : "No bonds match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedBonds.map((bond, idx) => (
              <div
                key={bond.id}
                onClick={() => router.push(`/primary?bond=${bond.symbol}`)}
                className={`card-luminous card-tilt rounded-2xl p-6 cursor-pointer reveal ${idx < 3 ? `reveal-d${idx + 1}` : ""}`}
              >
                {/* Top row */}
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-[var(--ink)] mb-1">{bond.issuer_name}</h3>
                    <p className="text-xs text-[var(--ink3)] font-mono">{bond.symbol}</p>
                  </div>
                </div>

                {/* Middle section */}
                <div className="mb-5">
                  <div
                    className="font-display leading-none mb-1"
                    style={{
                      fontSize: "clamp(2.4rem, 3vw, 3rem)",
                      background: "linear-gradient(125deg, var(--aqua-soft), var(--aqua-bright) 50%, var(--lilac))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      color: "transparent",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {bond.apy}%
                  </div>
                  <div className="eyebrow-dim mb-4">
                    Annual Yield
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="text-[11px] text-[var(--ink3)] mb-1">Maturity</div>
                      <div className="text-sm text-[var(--ink2)] font-medium font-mono">{bond.maturity_months} mo</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-[var(--ink3)] mb-1">Price</div>
                      <div className="text-sm text-[var(--ink2)] font-medium font-mono">{fmtCurrency(bond.price_per_token)}</div>
                    </div>
                  </div>
                </div>

                {/* Fill rate */}
                <div className="mb-5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[11px] text-[var(--ink3)]">Filled</span>
                    <span className="text-sm text-[var(--ink3)] font-medium font-mono tab">{bond.filled_percentage}%</span>
                  </div>
                  <div className="h-1 bg-[var(--shore)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--aqua-soft)] to-[var(--lilac)] rounded-full transition-all duration-300"
                      style={{ width: `${bond.filled_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Bottom button */}
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/primary?bond=${bond.symbol}`); }}
                  className="w-full btn-ghost flex items-center justify-center gap-2"
                >
                  View Bond
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-ghost px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="text-sm text-[var(--ink)] font-medium font-mono">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
