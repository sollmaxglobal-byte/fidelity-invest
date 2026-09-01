import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bitcoin,
  Building2,
  Check,
  Clock3,
  Copy,
  FileImage,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/dashboard/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit funds — Fidelity Invest" },
      {
        name: "description",
        content: "Fund your Fidelity Invest wallet with mobile money in four quick steps.",
      },
      { property: "og:title", content: "Deposit funds — Fidelity Invest" },
      { property: "og:description", content: "Fund your Fidelity Invest wallet in four steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepositPage,
});

type MethodType = "mobile_money" | "bank_transfer" | "crypto";
type Method = {
  id: string;
  name: string;
  type: MethodType;
  number: string;
  accountName?: string;
  instructions?: string;
};

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;

const money = (value: string | number) => Number(value || 0).toLocaleString("fr-FR");
const makeReference = () => `FID-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function MethodLogo({ method }: { method: Method }) {
  const key = method.name.toLowerCase();
  if (key.includes("mtn"))
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFCC00] text-[11px] font-black italic text-black">
        MTN
      </span>
    );
  if (key.includes("orange"))
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FF7900] text-[10px] font-black lowercase text-white">
        orange
      </span>
    );
  const Icon =
    method.type === "bank_transfer" ? Building2 : method.type === "crypto" ? Bitcoin : Smartphone;
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2a2a33] text-[#ffd45a]">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function DepositPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [reference] = useState(makeReference);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(900);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");

  const selected = methods.find((m) => m.id === methodId);
  const amountNumber = Number(amount);
  const amountError =
    amount && (amountNumber < MIN_AMOUNT || amountNumber > MAX_AMOUNT)
      ? `Enter an amount between ${money(MIN_AMOUNT)} and ${money(MAX_AMOUNT)} FCFA.`
      : "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, type, label, account_name, account_number, instructions")
        .eq("active", true)
        .in("scope", ["deposit", "both"])
        .order("type");
      if (error) toast.error("Could not load payment methods.");
      if (mounted && data)
        setMethods(
          data
            .map((m) => ({
              id: m.id,
              name: m.label,
              type: m.type as MethodType,
              number: m.account_number ?? "",
              accountName: m.account_name ?? undefined,
              instructions: m.instructions ?? undefined,
            }))
            .filter((m) => m.number),
        );
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (step === 2 && methods.length === 1) setMethodId(methods[0].id);
  }, [step, methods]);

  useEffect(() => {
    if (step !== 3 || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, remaining]);

  useEffect(() => {
    if (step !== 5 || !depositId) return;
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("deposits")
        .select("status")
        .eq("id", depositId)
        .maybeSingle();
      if (data?.status) setStatus(data.status);
    }, 10000);
    return () => window.clearInterval(poll);
  }, [step, depositId]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  }

  function next() {
    if (step === 1) {
      if (!amount || amountNumber < MIN_AMOUNT || amountNumber > MAX_AMOUNT)
        return toast.error(amountError || "Enter a valid amount.");
      setStep(2);
    } else if (step === 2) {
      if (!methodId) return toast.error("Choose a payment method.");
      setStep(3);
    } else if (step === 3) setStep(4);
  }

  async function submitProof() {
    if (!user || !file || !selected) return toast.error("Upload your payment screenshot.");
    setSubmitting(true);
    try {
      const path = `${user.id}/${reference}`;
      const { error: uploadError } = await supabase.storage
        .from("deposit-proofs")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicFile } = supabase.storage.from("deposit-proofs").getPublicUrl(path);
      const { data, error } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount: amountNumber,
          payment_method_id: selected.id,
          reference,
          proof_url: publicFile.publicUrl,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      setDepositId(data?.id ?? null);
      setStep(5);
      toast.success("Payment submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your deposit.");
    } finally {
      setSubmitting(false);
    }
  }

  const timer = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-[#101014] text-[#a9a9b0]">
        Loading deposit options…
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col bg-[#101014] text-[#f8f7f2]">
      {/* Top bar + progress */}
      <header className="flex items-center gap-3 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => (step > 1 && step < 5 ? setStep((step - 1) as 1 | 2 | 3 | 4) : navigate({ to: "/dashboard" }))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1c1c23] text-[#f8f7f2]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2a2a33]">
            <motion.div
              className="h-full rounded-full bg-[#ffd45a]"
              animate={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-2 w-2 rounded-full ${step >= n ? "bg-[#ffd45a]" : "bg-[#3c3c47]"}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="mt-6 font-display text-[34px] font-bold leading-tight">
                How much do you want to deposit?
              </h1>
              <div className="mt-10">
                <div className="relative">
                  <Input
                    id="deposit-amount"
                    value={amount ? money(amount) : ""}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    inputMode="numeric"
                    aria-label="Amount in FCFA"
                    className="h-20 rounded-2xl border-2 border-[#ffd45a] bg-transparent pr-24 text-center text-[32px] font-bold uppercase tabular-nums text-[#ffd45a] placeholder:text-[#5c5c66]"
                  />
                  <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-[22px] font-bold text-[#ffd45a]">
                    FCFA
                  </span>
                </div>
                <p className="mt-3 text-center text-sm text-[#a9a9b0]">
                  Min {money(MIN_AMOUNT)} · Max {money(MAX_AMOUNT)}
                </p>
                {amountError && (
                  <p className="mt-2 text-center text-sm text-destructive">{amountError}</p>
                )}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {QUICK_AMOUNTS.map((value) => {
                  const active = amountNumber === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`h-14 rounded-2xl border-2 text-lg font-bold transition ${
                        active
                          ? "border-[#ffd45a] bg-[#ffd45a] text-black"
                          : "border-[#ffd45a] text-[#ffd45a]"
                      }`}
                    >
                      {value / 1000}k
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="mt-6 font-display text-[34px] font-bold leading-tight">
                Select payment method
              </h1>
              <p className="mt-2 text-sm text-[#a9a9b0]">
                You are depositing {money(amount)} FCFA.
              </p>
              {methods.length === 0 ? (
                <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#3c3c47] p-8 text-center">
                  <Clock3 className="h-8 w-8 text-[#a9a9b0]" />
                  <h2 className="font-semibold">No payment methods available</h2>
                  <p className="text-sm text-[#a9a9b0]">Please check back shortly.</p>
                </div>
              ) : (
                <div className="mt-8 flex flex-col gap-4">
                  {methods.map((m) => {
                    const active = methodId === m.id;
                    return (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        key={m.id}
                        type="button"
                        onClick={() => setMethodId(m.id)}
                        className={`relative flex items-center gap-4 rounded-2xl p-4 text-left transition ${
                          active ? "bg-[#ffd45a] text-black" : "bg-[#26262e] text-[#f8f7f2]"
                        }`}
                      >
                        <MethodLogo method={m} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-lg font-bold">{m.name}</span>
                          <span
                            className={`block truncate text-xs ${active ? "text-black/70" : "text-[#a9a9b0]"}`}
                          >
                            {m.type === "mobile_money"
                              ? "Mobile Money"
                              : m.type === "bank_transfer"
                                ? "Bank transfer"
                                : "Crypto"}{" "}
                            · Instant
                          </span>
                        </span>
                        {active && (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-black">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && selected && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="mt-6 text-center font-display text-[32px] font-bold leading-tight">
                Complete your payment
              </h1>
              <p className="mt-1 text-center text-sm font-semibold text-[#a9a9b0]">
                Send exact amount
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <Field
                  label="Amount to send"
                  value={`${money(amount)} FCFA`}
                  highlight
                  onCopy={() => copy(amount)}
                />
                <Field
                  label="Send to number"
                  value={selected.number}
                  onCopy={() => copy(selected.number)}
                />
                <Field
                  label="Account name"
                  value={selected.accountName || selected.name}
                  hint="Confirm this name before you send the money"
                  onCopy={() => copy(selected.accountName || selected.name)}
                />
                {selected.instructions && (
                  <p className="rounded-2xl bg-[#1c1c23] p-4 text-sm text-[#a9a9b0]">
                    {selected.instructions}
                  </p>
                )}
              </div>
              <div className="mt-8 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-[28px] font-bold text-[#ffd45a]">
                  <Clock3 className="h-6 w-6" />
                  <span className="tabular-nums">{timer}</span>
                </div>
                <p className="text-sm text-[#a9a9b0]">Payment window expires in</p>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="proof"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-1 flex-col"
            >
              <label
                htmlFor="proof"
                className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#ffd45a] p-6 text-center"
              >
                <Upload className="h-9 w-9 text-[#ffd45a]" />
                <span className="text-2xl font-bold text-[#ffd45a]">Tap to upload</span>
                <Input
                  id="proof"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 5 * 1024 * 1024) toast.error("File must be smaller than 5MB.");
                    else setFile(f ?? null);
                  }}
                />
              </label>
              <p className="mt-3 text-center text-sm font-semibold">
                Upload payment screenshot or receipt
              </p>
              {file && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#1c1c23] p-3">
                  <FileImage className="h-5 w-5 text-[#ffd45a]" />
                  <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  <button
                    type="button"
                    aria-label="Remove screenshot"
                    onClick={() => setFile(null)}
                    className="rounded-full p-1 text-[#a9a9b0]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="mt-8 rounded-2xl bg-[#1c1c23] p-4 text-sm text-[#a9a9b0]">
                Depositing <strong className="text-[#f8f7f2]">{money(amount)} FCFA</strong> via{" "}
                <strong className="text-[#f8f7f2]">{selected?.name}</strong>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col items-center pt-10 text-center"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd45a] text-black"
              >
                <Check className="h-8 w-8" />
              </motion.span>
              <h1 className="mt-5 font-display text-2xl font-bold text-[#ffd45a]">
                Payment submitted!
              </h1>

              <div className="mt-10 flex w-full items-center justify-between gap-2">
                {[
                  ["Uploaded", true],
                  ["Verifying", status === "pending"],
                  ["Credited", status === "approved"],
                ].map(([label, done], i) => (
                  <div key={String(label)} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        done ? "bg-[#ffd45a] text-black" : "bg-[#2a2a33] text-[#a9a9b0]"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-semibold">{label}</span>
                    {i === 1 && status === "pending" && (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd45a]" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-10 w-full rounded-2xl bg-[#1c1c23] p-4 text-left text-sm">
                <Row label="Amount" value={`${money(amount)} FCFA`} />
                <Row label="Method" value={selected?.name ?? "—"} />
                <Row label="Reference" value={reference} />
              </div>

              <p className="mt-8 text-sm font-semibold">Estimated time: 5–15 minutes</p>
              <p className="mt-1 text-sm text-[#a9a9b0]">We’ll notify you once credited</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sticky full-width action */}
      <div className="sticky bottom-0 bg-[#101014] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        {step < 4 && (
          <Button
            onClick={next}
            disabled={step === 2 && methods.length === 0}
            className="h-14 w-full rounded-2xl bg-[#ffd45a] text-lg font-bold text-black hover:bg-[#ffd45a]/90"
          >
            {step === 3 ? "I have paid" : "Continue"}
          </Button>
        )}
        {step === 4 && (
          <Button
            onClick={submitProof}
            disabled={!file || submitting}
            className="h-14 w-full rounded-2xl bg-[#ffd45a] text-lg font-bold text-black hover:bg-[#ffd45a]/90"
          >
            {submitting ? "Submitting…" : "Submit payment"}
          </Button>
        )}
        {step === 5 && (
          <Button
            onClick={() => navigate({ to: "/dashboard" })}
            className="h-14 w-full rounded-2xl bg-[#ffd45a] text-lg font-bold text-black hover:bg-[#ffd45a]/90"
          >
            Back to dashboard
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  highlight,
  onCopy,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#ffd45a]/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-[#ffd45a]">{label}</span>
        {onCopy && (
          <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="text-[#ffd45a]">
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
      <p
        className={`mt-1 break-words text-2xl font-bold ${highlight ? "text-[#ffd45a]" : "text-[#f8f7f2]"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[#a9a9b0]">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <span className="text-[#a9a9b0]">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
