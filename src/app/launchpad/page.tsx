"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

  const handleInvest = (symbol: string) => router.push(`/primary?bond=${symbol}`);

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
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #0d1117 25%, #151c28 50%, #0d1117 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* Page Layout */}
      <section style={{ background: "#05080f", minHeight: "100vh", paddingTop: "48px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>Bond Markets</h1>
              <p style={{ fontSize: "14px", color: "#64748b" }}>Discover and invest in tokenized bonds on Base Network</p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "8px 16px", fontSize: "13px", color: "#94a3b8" }}>
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{bonds.length}</span> bonds
              </div>
              <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "8px 16px", fontSize: "13px", color: "#94a3b8" }}>
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{fmtCurrency(totalVolume)}</span> volume
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "32px", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: "280px" }}>
              <Search style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#475569", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search bonds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "10px 16px 10px 44px",
                  fontSize: "14px",
                  color: "#f1f5f9",
                  outline: "none"
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "rgba(76,125,244,0.4)"}
                onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                background: "#0d1117",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                padding: "10px 16px",
                fontSize: "14px",
                color: "#f1f5f9",
                outline: "none",
                width: "160px",
                cursor: "pointer"
              }}
            >
              <option value="default">Sort by Default</option>
              <option value="apy">Highest APY</option>
              <option value="size">Largest Size</option>
              <option value="filled">Fill Rate</option>
            </select>
          </div>

          {/* Bond Grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <div className="shimmer" style={{ height: "16px", width: "120px", borderRadius: "4px", marginBottom: "8px" }} />
                      <div className="shimmer" style={{ height: "12px", width: "60px", borderRadius: "4px" }} />
                    </div>
                    <div className="shimmer" style={{ height: "20px", width: "50px", borderRadius: "20px" }} />
                  </div>
                  <div className="shimmer" style={{ height: "36px", width: "80px", borderRadius: "4px", marginBottom: "8px" }} />
                  <div className="shimmer" style={{ height: "12px", width: "100px", borderRadius: "4px", marginBottom: "20px" }} />
                  <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <div className="shimmer" style={{ height: "10px", width: "60px", borderRadius: "4px", marginBottom: "6px" }} />
                      <div className="shimmer" style={{ height: "14px", width: "40px", borderRadius: "4px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="shimmer" style={{ height: "10px", width: "60px", borderRadius: "4px", marginBottom: "6px" }} />
                      <div className="shimmer" style={{ height: "14px", width: "50px", borderRadius: "4px" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div className="shimmer" style={{ height: "10px", width: "60px", borderRadius: "4px" }} />
                      <div className="shimmer" style={{ height: "10px", width: "30px", borderRadius: "4px" }} />
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                      <div className="shimmer" style={{ height: "100%", width: "60%" }} />
                    </div>
                  </div>
                  <div className="shimmer" style={{ height: "40px", width: "100%", borderRadius: "10px" }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "16px" }}>
              <p style={{ fontSize: "14px", color: "#ef4444" }}>Failed to load bonds: {error}</p>
              <button
                onClick={() => fetchBonds()}
                style={{
                  background: "rgba(76,125,244,0.1)",
                  color: "#4c7df4",
                  border: "1px solid rgba(76,125,244,0.3)",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "opacity 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                Try again
              </button>
            </div>
          ) : filteredBonds.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
              <p style={{ fontSize: "14px", color: "#64748b" }}>
                {bonds.length === 0 ? "No active bond offerings at this time." : "No bonds match your search criteria."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {paginatedBonds.map((bond) => {
                return (
                  <div
                    key={bond.id}
                    onClick={() => router.push(`/primary?bond=${bond.symbol}`)}
                    style={{
                      background: "#0d1117",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "16px",
                      padding: "24px",
                      cursor: "pointer",
                      transition: "border-color 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(76,125,244,0.4)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
                  >
                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>{bond.issuer_name}</h3>
                        <p style={{ fontSize: "12px", color: "#64748b" }}>{bond.symbol}</p>
                      </div>
                    </div>

                    {/* Middle section */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "36px", fontWeight: 700, color: "#34d399", lineHeight: 1, marginBottom: "8px" }}>
                        {bond.apy}%
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px" }}>
                        ANNUAL YIELD
                      </div>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Maturity</div>
                          <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>{bond.maturity_months} months</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Price</div>
                          <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: 500 }}>{fmtCurrency(bond.price_per_token)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Fill rate */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Fill Rate</span>
                        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>{bond.filled_percentage}%</span>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${bond.filled_percentage}%`, background: "#4c7df4", borderRadius: "2px", transition: "width 0.3s" }} />
                      </div>
                    </div>

                    {/* Bottom button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/primary?bond=${bond.symbol}`); }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "1px solid rgba(76,125,244,0.3)",
                        color: "#4c7df4",
                        borderRadius: "10px",
                        padding: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "background 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(76,125,244,0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      View Bond
                      <ChevronRight style={{ width: "16px", height: "16px" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "40px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#94a3b8",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.4 : 1,
                  transition: "opacity 0.15s"
                }}
              >
                Previous
              </button>
              <div style={{ fontSize: "14px", color: "#f1f5f9", fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#94a3b8",
                  borderRadius: "8px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  transition: "opacity 0.15s"
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

