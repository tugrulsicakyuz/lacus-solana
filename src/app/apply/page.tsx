"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Upload, X, FileCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { CONTRACTS } from "@/config/contracts";
import { decodeEventLog } from "viem";
import { retryInsert } from "@/lib/supabase-retry";

const baseScanUrl = (hash: string) =>
  `https://sepolia.basescan.org/tx/${hash}`;


const STEPS = [
  { number: 1, label: "Issuer Info" },
  { number: 2, label: "Bond Details" },
  { number: 3, label: "Documents" },
  { number: 4, label: "Sign Agreement" },
  { number: 5, label: "Review & Submit" },
];

const REQUIRED_DOCS = [
  { type: "financial_statements",      label: "Financial Statements",      hint: "Last 2 fiscal years" },
  { type: "business_registration",     label: "Business Registration",     hint: "Incorporation documents" },
  { type: "loan_agreement",            label: "Loan Agreement",            hint: "Signed loan agreement" },
] as const;

type DocType = typeof REQUIRED_DOCS[number]["type"];

export default function ApplyPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    issuer_name: "",
    symbol: "",
    apy: "",
    maturity_months: "",
    total_issue_size: "",
    price_per_token: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Partial<Record<DocType, { path: string; name: string }>>>({
    financial_statements: { path: "test/financial_statements.pdf", name: "Financial Statements.pdf" },
    business_registration: { path: "test/business_registration.pdf", name: "Business Registration.pdf" },
    loan_agreement: { path: "test/loan_agreement.pdf", name: "Loan Agreement.pdf" },
  });
  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [createdTxHash, setCreatedTxHash] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [loanAgreementHash, setLoanAgreementHash] = useState<`0x${string}`>("0x0000000000000000000000000000000000000000000000000000000000000000");
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Blockchain transaction hooks
  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!form.issuer_name.trim()) {
      setError("Issuer name is required");
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    if (!/^[A-Za-z]+$/.test(form.symbol.trim())) {
      setError("Bond symbol can only contain letters (e.g. GRNE, USGB)");
      return false;
    }
    const apyValue = parseFloat(form.apy);
    if (!form.apy || apyValue <= 0 || apyValue > 50) {
      setError("APY must be between 0.01% and 50%");
      return false;
    }
    const maturityValue = parseInt(form.maturity_months, 10);
    if (!form.maturity_months || maturityValue < 1 || maturityValue > 360) {
      setError("Maturity must be between 1 and 360 months");
      return false;
    }
    const issueSizeValue = parseFloat(form.total_issue_size);
    if (!form.total_issue_size || issueSizeValue < 1000) {
      setError("Total issue size must be at least $1,000");
      return false;
    }
    const priceValue = parseFloat(form.price_per_token);
    if (!form.price_per_token || priceValue <= 0) {
      setError("Token price must be greater than 0");
      return false;
    }
    setError(null);
    return true;
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !lastPos) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setLastPos(pos);
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const computeAgreementHash = useCallback(async () => {
    const canvas = signatureCanvasRef.current;
    const signatureData = canvas ? canvas.toDataURL("image/png") : "";
    const canonicalData = JSON.stringify({
      version: "lacus-loan-agreement-v3",
      issuerName: form.issuer_name,
      bondSymbol: form.symbol?.trim().toUpperCase(),
      apy: form.apy,
      maturityDate: form.maturity_months,
      totalSupply: form.total_issue_size,
      pricePerToken: form.price_per_token,
      signatureData: signatureData.slice(0, 100),
      signedAt: new Date().toISOString(),
    });
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("") as `0x${string}`;
    setLoanAgreementHash(hashHex);
    return hashHex;
  }, [form, signatureCanvasRef]);

  const handleDocUpload = async (docType: DocType, file: File) => {
    if (!address || !form.symbol) {
      toast.error("Please complete Bond Details first");
      return;
    }
    setUploadingDoc(docType);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${address.toLowerCase()}/${form.symbol.toUpperCase()}/${docType}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("borrower-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("borrower_documents").upsert(
        {
          wallet_address: address.toLowerCase(),
          bond_symbol: form.symbol.toUpperCase(),
          document_type: docType,
          file_path: path,
          file_name: file.name,
        },
        { onConflict: "wallet_address,bond_symbol,document_type" }
      );
      if (dbError) throw dbError;

      setUploadedDocs((prev) => ({ ...prev, [docType]: { path, name: file.name } }));
      toast.success(`${file.name} uploaded`);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message ?? "Unknown error"));
    } finally {
      setUploadingDoc(null);
    }
  };

  const removeDoc = async (docType: DocType) => {
    const doc = uploadedDocs[docType];
    if (!doc) return;
    await supabase.storage.from("borrower-documents").remove([doc.path]);
    await supabase.from("borrower_documents")
      .delete()
      .eq("wallet_address", address?.toLowerCase() ?? "")
      .eq("bond_symbol", form.symbol.toUpperCase())
      .eq("document_type", docType);
    setUploadedDocs((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const allDocsUploaded = REQUIRED_DOCS.every((d) => uploadedDocs[d.type]);

  const validateStep3 = () => {
    if (!hasSignature) {
      toast.error("Please sign the agreement using your touchpad or mouse");
      return false;
    }
    if (!agreementChecked) {
      toast.error("Please confirm you have read and agree to the Loan Agreement");
      return false;
    }
    return true;
  };

  const handleNextStep3 = async () => {
    if (!validateStep3()) return;
    await computeAgreementHash();
    setStep(5);
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) {
      if (!allDocsUploaded) {
        setError("Please upload all required documents before continuing.");
        return;
      }
      setError(null);
      setStep(4);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!address) {
      setError("Please connect your wallet");
      setSubmitting(false);
      return;
    }

    try {
      const maturityMonths = parseInt(form.maturity_months, 10);
      const maturityDate = Math.floor(Date.now() / 1000) + maturityMonths * 30 * 24 * 60 * 60;
      const totalIssueSize = parseFloat(form.total_issue_size);
      const pricePerToken = parseFloat(form.price_per_token);
      const totalSupplyCap = Math.floor(totalIssueSize / pricePerToken);
      const totalSupplyCapWei = BigInt(totalSupplyCap) * BigInt("1000000000000000000");
      const bondName = `${form.issuer_name.trim()} ${form.symbol.trim().toUpperCase()} Bond`;
      const bondSymbol = form.symbol.trim().toUpperCase();

      toast.loading("Creating bond contract on-chain… Please confirm in your wallet.", {
        id: "bond-creation",
      });

      writeContract(
        {
          address: CONTRACTS.bondFactory.address,
          abi: CONTRACTS.bondFactory.abi,
          functionName: "createBond",
          args: [bondName, bondSymbol, address, BigInt(maturityDate), totalSupplyCapWei, BigInt(Math.round(pricePerToken * 1_000_000)), loanAgreementHash],
        },
        {
          onError: (error) => {
            console.error("Blockchain transaction error:", error);
            setError("Blockchain transaction failed: " + error.message);
            setSubmitting(false);
            toast.error("Bond contract could not be created", { id: "bond-creation" });
          },
        }
      );
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setSubmitting(false);
      toast.dismiss("bond-creation");
    }
  };

  useEffect(() => {
    if (hash) {
      toast.loading("Waiting for blockchain confirmation...", { id: "bond-creation" });
    }
  }, [hash]);

  useEffect(() => {
    const syncToSupabase = async () => {
      if (!isConfirmed || !address || !hash || !publicClient) return;

      try {
        toast.loading("Extracting bond contract address...", { id: "bond-creation" });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        let bondAddress = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: CONTRACTS.bondFactory.abi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "BondDeployed" && decoded.args && typeof decoded.args === "object" && "bondAddress" in decoded.args) {
              bondAddress = decoded.args.bondAddress as string;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!bondAddress) throw new Error("Bond contract address not found in transaction logs");

        toast.loading("Saving bond to database...", { id: "bond-creation" });

        const payload = {
          issuer_name: form.issuer_name.trim(),
          symbol: form.symbol.trim().toUpperCase(),
          apy: parseFloat(form.apy),
          maturity_months: parseInt(form.maturity_months, 10),
          total_issue_size: parseFloat(form.total_issue_size),
          price_per_token: parseFloat(form.price_per_token),
          risk_rating: "A",
          filled_percentage: 0,
          issuer_wallet: address.toLowerCase(),
          contract_address: bondAddress.toLowerCase(),
          documents_complete: true,
        };

        const result = await retryInsert("bonds", payload);
        if (result.success) {
          toast.success("🎉 Bond created successfully!", { id: "bond-creation" });
          setCreatedTxHash(hash!);
          setSubmitted(true);
        } else {
          console.error("Supabase insert error:", result.error);
          setError("Database save failed after 3 retries. Your bond was deployed on-chain at tx: " + hash + " — contact support with this hash.");
          toast.error("Database save failed. Bond was deployed on-chain.", { id: "bond-creation" });
        }
      } catch (err) {
        console.error("Supabase sync error:", err);
        setError(err instanceof Error ? err.message : "Database sync error");
        toast.error("An unexpected error occurred", { id: "bond-creation" });
      } finally {
        setSubmitting(false);
      }
    };

    syncToSupabase();
  }, [isConfirmed, address, hash, publicClient, form]);

  /* ── SSR guard ── */
  if (!mounted) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--lilac)]" />
      </section>
    );
  }

  /* ── Not connected ── */
  if (!isConnected) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center text-center px-4">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--lilac)]/10">
            <ShieldCheck className="h-10 w-10 text-[var(--lilac)]" />
          </div>
          <h2 className="font-display text-[var(--ink)] text-2xl sm:text-3xl mb-3">Connect Your Wallet</h2>
          <p className="text-base text-[var(--ink3)] max-w-md mb-8">Connect your wallet to apply for a bond listing.</p>
          <ConnectButton />
        </div>
      </section>
    );
  }

  /* ── Success state ── */
  if (submitted) {
    return (
      <>
        <section className="pt-20 pb-4">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--aqua)]/10">
              <CheckCircle2 className="h-7 w-7 text-[var(--aqua)]" />
            </div>
            <h1 className="font-display text-[var(--ink)] text-3xl sm:text-4xl">
              Your Bond is Live!
            </h1>
            <p className="mt-3 text-base sm:text-lg text-[var(--ink3)]">
              Your loan agreement has been signed and hashed on-chain. Your bond is now visible on the primary market.
            </p>
          </div>
        </section>

        <section className="pt-6 pb-14">
          <div className="card-luminous rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
              <div className="h-px bg-gradient-to-r from-[var(--aqua)]/40 via-[var(--aqua)]/10 to-transparent" />

              {/* Bond summary */}
              <div className="rounded-xl p-5 space-y-4 bg-[var(--surface)] border border-[var(--rule)]">
                <p className="eyebrow-dim">Bond Summary</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: "Issuer", value: form.issuer_name },
                    { label: "Symbol", value: form.symbol.toUpperCase() },
                    { label: "Annual Yield", value: `${form.apy}%`, highlight: "var(--aqua)" },
                    { label: "Maturity", value: `${form.maturity_months} months` },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--ink4)]">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold" style={{ color: item.highlight ?? 'var(--ink)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction link */}
              {createdTxHash && (
                <a
                  href={baseScanUrl(createdTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink3)] hover:text-[var(--lilac)] hover:border-[var(--lilac)]/30 transition-colors"
                >
                  View transaction details →
                </a>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href="/manage"
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-sm"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Go to Dashboard
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setCreatedTxHash(null);
                    setStep(1);
                    setForm({
                      issuer_name: "",
                      symbol: "",
                      apy: "",
                      maturity_months: "",
                      total_issue_size: "",
                      price_per_token: "",
                    });
                    setSignatureName("");
                    setAgreementChecked(false);
                    setLoanAgreementHash("0x0000000000000000000000000000000000000000000000000000000000000000");
                    clearSignature();
                    setHasSignature(false);
                    setUploadedDocs({});
                    setError(null);
                  }}
                  className="btn-ghost flex-1 flex items-center justify-center gap-2 py-4 text-sm"
                >
                  Create Another Bond
                </button>
              </div>
            </div>
        </section>
      </>
    );
  }

  /* ── Main wizard ── */
  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        
        {/* Page Header */}
        <div className="mb-6">
          <p className="eyebrow eyebrow-rule mb-2">Bond Application</p>
          <h1 className="font-display text-[var(--ink)] text-[2.25rem] mb-2">Issue a Bond</h1>
          <p className="text-sm text-[var(--ink3)]">Complete all steps to list your bond on Lacus Markets.</p>
        </div>

        {/* Horizontal Step Progress Bar */}
        <div className="mt-6 mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isCompleted = step > s.number;
              const isActive = step === s.number;
              const isUpcoming = step < s.number;
              
              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold mb-2 transition-all"
                      style={{
                        background: isCompleted ? "rgba(94,234,212,0.15)" : isActive ? "var(--lilac)" : "var(--surface)",
                        border: isCompleted ? "none" : isActive ? "none" : "1px solid var(--rule)",
                        color: isCompleted ? "var(--aqua)" : isActive ? "#fff" : "var(--ink4)",
                      }}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.number}
                    </div>
                    <p className="text-[12px] text-center font-medium" style={{ color: isCompleted ? "var(--aqua)" : isActive ? "var(--ink)" : "var(--ink4)" }}>
                      {s.label}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-full h-px bg-[var(--rule)] mb-8" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="card-luminous rounded-2xl p-9">

            {/* STEP 1: Issuer Info */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--ink)] mb-1">Issuer Information</h2>
                <p className="text-[13px] text-[var(--ink3)] mb-7">Tell us about your organization.</p>

                <div className="mb-5">
                  <label htmlFor="issuer_name" className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--ink3)] mb-1.5">
                    Issuer Name <span className="text-[var(--coral)]">*</span>
                  </label>
                  <input
                    id="issuer_name"
                    name="issuer_name"
                    type="text"
                    required
                    value={form.issuer_name}
                    onChange={handleChange}
                    placeholder="e.g. Green Energy Corp"
                    className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                  />
                  <p className="text-xs text-[var(--ink4)] mt-1">This will appear as the bond issuer name on all listings.</p>
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 bg-[var(--coral)]/8 border border-[var(--coral)]/20 mb-5">
                    <p className="text-sm text-[var(--coral)]">{error}</p>
                  </div>
                )}

                <div className="mt-7 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary px-6 py-2.5 text-sm"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Bond Details */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--ink)] mb-1">Bond Details</h2>
                <p className="text-[13px] text-[var(--ink3)] mb-7">Configure the financial parameters of your bond.</p>

                {/* Bond Symbol */}
                <div className="mb-5">
                  <label htmlFor="symbol" className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--ink3)] mb-1.5">
                    Bond Symbol <span className="text-[var(--coral)]">*</span>
                  </label>
                  <input
                    id="symbol"
                    name="symbol"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[A-Za-z]+"
                    value={form.symbol}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^A-Za-z]/g, "");
                      setForm((prev) => ({ ...prev, symbol: cleaned }));
                    }}
                    placeholder="e.g. GRNE"
                    className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors uppercase"
                  />
                  <p className="text-xs text-[var(--ink4)] mt-1">Max 6 letters only. e.g. GRNE, USGB</p>
                </div>

                {/* APY + Maturity */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { id: "apy", label: "Annual Yield Rate (%)", type: "number", step: "0.01", min: "0", placeholder: "e.g. 7.5" },
                    { id: "maturity_months", label: "Maturity (Months)", type: "number", min: "1", placeholder: "e.g. 24" },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--ink3)] mb-1.5">
                        {field.label} <span className="text-[var(--coral)]">*</span>
                      </label>
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        step={field.step}
                        min={field.min}
                        required
                        value={form[field.id as keyof typeof form]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>

                {/* Issue Size + Price */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { id: "total_issue_size", label: "Total Issue Size ($)", type: "number", min: "0", placeholder: "e.g. 5000000" },
                    { id: "price_per_token", label: "Token Price ($)", type: "number", step: "0.01", min: "0", placeholder: "e.g. 102.50" },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--ink3)] mb-1.5">
                        {field.label} <span className="text-[var(--coral)]">*</span>
                      </label>
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        step={field.step}
                        min={field.min}
                        required
                        value={form[field.id as keyof typeof form]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        className="w-full bg-[var(--surface)] border border-[var(--rule)] focus:border-[var(--lilac)] rounded-xl px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 bg-[var(--coral)]/8 border border-[var(--coral)]/20 mb-5">
                    <p className="text-sm text-[var(--coral)]">{error}</p>
                  </div>
                )}

                <div className="mt-7 flex justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-ghost px-6 py-2.5 text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary px-6 py-2.5 text-sm"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Documents */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--ink)] mb-1">Financial Documents</h2>
                <p className="text-[13px] text-[var(--ink3)] mb-7">
                  Upload all required documents. These will be visible to potential investors.
                </p>

                <div className="flex flex-col gap-3">
                  {REQUIRED_DOCS.map((doc) => {
                    const uploaded = uploadedDocs[doc.type];
                    const isUploading = uploadingDoc === doc.type;
                    return (
                      <div
                        key={doc.type}
                        className={`flex items-center justify-between rounded-xl p-4 border transition-colors ${
                          uploaded
                            ? 'bg-[var(--aqua)]/5 border-[var(--aqua)]/20'
                            : 'bg-[var(--surface)] border-[var(--rule)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {uploaded ? (
                            <FileCheck className="h-4 w-4 shrink-0 text-[var(--aqua)]" />
                          ) : (
                            <div className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-[var(--rule)]" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: uploaded ? 'var(--aqua)' : 'var(--ink2)' }}>
                              {doc.label}
                            </p>
                            <p className="text-xs truncate text-[var(--ink4)]">
                              {uploaded ? uploaded.name : doc.hint}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--lilac)]" />
                          ) : uploaded ? (
                            <button
                              type="button"
                              onClick={() => removeDoc(doc.type)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--coral)]/10 text-[var(--coral)]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocUpload(doc.type, file);
                                  e.target.value = "";
                                }}
                              />
                              <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium btn-ghost hover:opacity-80">
                                <Upload className="h-3 w-3" />
                                Upload
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="rounded-xl px-4 py-3 bg-[var(--coral)]/8 border border-[var(--coral)]/20 mb-5">
                    <p className="text-sm text-[var(--coral)]">{error}</p>
                  </div>
                )}

                <div className="mt-7 flex justify-between">
                  <button type="button" onClick={handleBack}
                    className="btn-ghost px-6 py-2.5 text-sm">
                    Back
                  </button>
                  <button type="button" onClick={handleNext}
                    disabled={!allDocsUploaded || !!uploadingDoc}
                    className="btn-primary px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Sign Agreement */}
            {step === 4 && (
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>Review &amp; Sign Agreement</h2>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>Read the Loan Agreement carefully, then sign below to proceed.</p>

                {/* Document Viewer */}
                <div style={{ background: "#0a0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden", marginBottom: "24px" }}>
                  {/* Header */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(76,125,244,0.15)", border: "1px solid rgba(76,125,244,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#4c7df4" strokeWidth="1.4" strokeLinejoin="round"/>
                          <path d="M10 2v3h3" stroke="#4c7df4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 8h6M5 11h4" stroke="#4c7df4" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#f1f5f9" }}>Lacus Loan Agreement</p>
                        <p style={{ fontSize: "11px", color: "#475569" }}>Version 3 · Originated via Lacus Protocol</p>
                      </div>
                    </div>
                    <a
                      href="/loan-agreement-v3.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: "#4c7df4", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#7ca3ff"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#4c7df4"}
                    >
                      Full PDF ↗
                    </a>
                  </div>

                  {/* Agreement body */}
                  <div style={{ padding: "24px" }}>
                    {/* Preamble */}
                    <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4c7df4", marginBottom: "8px" }}>LOAN AGREEMENT</p>
                    <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
                      This Agreement is solely between Borrower and Lender(s). Lacus is NOT a party to this Agreement.
                      Effective Date: <span style={{ color: "#94a3b8" }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </p>

                    {/* Key Terms Table */}
                    <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", marginBottom: "12px" }}>KEY LOAN TERMS</p>
                    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
                      {[
                        { label: "Borrower Legal Name", value: form.issuer_name || "—" },
                        { label: "Bond Symbol", value: form.symbol ? form.symbol.toUpperCase() : "—" },
                        { label: "Loan Amount (USDC)", value: form.total_issue_size ? `$${Number(form.total_issue_size).toLocaleString()}` : "—" },
                        { label: "Annual Percentage Rate", value: form.apy ? `${form.apy}%` : "—" },
                        { label: "Maturity", value: form.maturity_months ? `${form.maturity_months} months` : "—" },
                        { label: "Settlement Currency", value: "USDC" },
                        { label: "Governing Network", value: "Solana Devnet" },
                      ].map((row, idx, arr) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: idx < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                          <span style={{ fontSize: "12px", color: "#475569" }}>{row.label}</span>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Notice */}
                    <div style={{ display: "flex", gap: "10px", padding: "12px 16px", background: "rgba(76,125,244,0.05)", border: "1px solid rgba(76,125,244,0.12)", borderRadius: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <circle cx="8" cy="8" r="7" stroke="#4c7df4" strokeWidth="1.2"/>
                        <path d="M8 5v3.5M8 11h.01" stroke="#4c7df4" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                      <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
                        By signing below, you confirm that the information above is accurate and agree to be bound by the full terms of the Lacus Loan Agreement. The signed agreement will be hashed using SHA-256 for on-chain verification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signing Page */}
                <div className="rounded-xl overflow-hidden" style={{ background: "#131b28", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width: 3, height: 20, background: "#4c7df4", borderRadius: 2 }} />
                    <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>Signature Page</span>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Signatory info */}
                    <div className="space-y-4">
                      <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Borrower</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            Full Legal Name <span style={{ color: "#f87171" }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Your full legal name"
                            value={signatureName}
                            onChange={(e) => setSignatureName(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              padding: "10px 12px",
                              color: "rgba(255,255,255,0.85)",
                              fontSize: 14,
                              outline: "none",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(76,125,244,0.5)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Title / Position</label>
                          <input
                            type="text"
                            placeholder="e.g. CEO, Director"
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              padding: "10px 12px",
                              color: "rgba(255,255,255,0.85)",
                              fontSize: 14,
                              outline: "none",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(76,125,244,0.5)")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                          />
                        </div>
                      </div>
                      <div className="pt-2 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Company</p>
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{form.issuer_name || "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Date</p>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {/* Right: Signature canvas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Signature</p>
                        {hasSignature && (
                          <button
                            onClick={clearSignature}
                            className="text-xs transition-colors"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div
                        className="relative rounded-lg transition-colors"
                        style={{
                          border: hasSignature ? "2px solid rgba(76,125,244,0.5)" : "2px dashed rgba(255,255,255,0.1)",
                        }}
                      >
                        <canvas
                          ref={signatureCanvasRef}
                          width={340}
                          height={160}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                          className="w-full rounded-lg cursor-crosshair touch-none"
                          style={{ height: "160px", background: "#05080f" }}
                        />
                        {!hasSignature && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>Sign here with your touchpad or mouse</p>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Draw your signature above</p>
                    </div>
                  </div>

                  {/* ESIGN consent */}
                  <div className="px-6 pb-6">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg transition-colors"
                      style={{ background: "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <input
                        type="checkbox"
                        checked={agreementChecked}
                        onChange={(e) => setAgreementChecked(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0"
                        style={{ accentColor: "#4c7df4" }}
                      />
                      <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                        I have read and agree to the{" "}
                        <a href="/loan-agreement-v3.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "#4c7df4", textDecoration: "underline" }}>
                          Lacus Loan Agreement
                        </a>
                        . I confirm that all information provided is accurate. By signing above and checking this box, I am executing this Agreement electronically pursuant to the{" "}
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>Electronic Signatures in Global and National Commerce Act (ESIGN Act), 15 U.S.C. § 7001</span>.
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: "28px", display: "flex", justifyContent: "space-between" }}>
                  <button
                    onClick={handleBack}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", cursor: "pointer" }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep3}
                    disabled={!hasSignature || !agreementChecked}
                    style={{
                      background: hasSignature && agreementChecked ? "#4c7df4" : "rgba(76,125,244,0.3)",
                      color: "#fff",
                      borderRadius: "10px",
                      padding: "10px 24px",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "none",
                      cursor: hasSignature && agreementChecked ? "pointer" : "not-allowed",
                      opacity: hasSignature && agreementChecked ? 1 : 0.4
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Review & Submit */}
            {step === 5 && (
              <form onSubmit={handleSubmit}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#f1f5f9", marginBottom: "4px" }}>Review &amp; Submit</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>Confirm your bond details before creating the on-chain contract.</p>

                  {/* Summary Card */}
                  <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Bond Summary</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: "Issuer", value: form.issuer_name },
                        { label: "Symbol", value: form.symbol.toUpperCase() },
                        { label: "Annual Yield", value: `${form.apy}%`, highlight: "#34d399" },
                        { label: "Maturity", value: `${form.maturity_months} months` },
                        { label: "Issue Size", value: `$${Number(form.total_issue_size).toLocaleString()}` },
                        { label: "Token Price", value: `$${form.price_per_token}` },
                        {
                          label: "Token Supply",
                          value: form.total_issue_size && form.price_per_token
                            ? Math.floor(parseFloat(form.total_issue_size) / parseFloat(form.price_per_token)).toLocaleString()
                            : "—"
                        },
                        { label: "Signed by", value: signatureName },
                        { label: "Agreement Hash", value: `${loanAgreementHash.slice(0, 10)}...${loanAgreementHash.slice(-6)}`, mono: true },
                      ].map((item) => (
                        <div key={item.label}>
                          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)" }}>{item.label}</p>
                          <p
                            className="mt-0.5 text-sm font-semibold"
                            style={{
                              color: item.highlight ?? "rgba(255,255,255,0.85)",
                              fontFamily: item.mono ? "monospace" : undefined,
                              fontSize: item.mono ? 12 : undefined,
                            }}
                          >
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl px-4 py-3" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
                    <p className="text-xs" style={{ color: "rgba(251,191,36,0.8)" }}>
                      <span className="font-semibold">Note:</span> Submitting will trigger a wallet confirmation to deploy a bond smart contract in the current demo environment. This action cannot be undone.
                    </p>
                  </div>

                  {error && (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
                      <p style={{ fontSize: "14px", color: "#f87171" }}>{error}</p>
                    </div>
                  )}

                  <div style={{ marginTop: "28px", display: "flex", justifyContent: "space-between" }}>
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={submitting || isWritePending || isConfirming}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", cursor: submitting || isWritePending || isConfirming ? "not-allowed" : "pointer", opacity: submitting || isWritePending || isConfirming ? 0.4 : 1 }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || isWritePending || isConfirming}
                      style={{ background: "#4c7df4", color: "#fff", borderRadius: "10px", padding: "10px 24px", fontSize: "14px", fontWeight: 500, border: "none", cursor: submitting || isWritePending || isConfirming ? "not-allowed" : "pointer", opacity: submitting || isWritePending || isConfirming ? 0.4 : 1, display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      {submitting || isWritePending || isConfirming ? (
                        <>
                          <Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />
                          {isWritePending && "Confirming..."}
                          {isConfirming && "Processing..."}
                          {!isWritePending && !isConfirming && "Saving..."}
                        </>
                      ) : (
                        <>
                          <ShieldCheck style={{ width: "16px", height: "16px" }} />
                          Create Bond Contract
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
      </div>
    </div>
  );
}
