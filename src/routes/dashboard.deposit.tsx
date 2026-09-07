import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
import { verifyDepositProof } from "@/lib/deposit-verify.functions";

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

const QUICK_AMOUNTS = [500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];

const money = (value: string | number) => Number(value || 0).toLocaleString("fr-FR");
const makeReference = () => `FID-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function MethodLogo({ method }: { method: Method }) {
  const key = method.name.toLowerCase();
  if (key.includes("mtn"))
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFCC00] text-[10px] font-black italic text-black">
        MTN
      </span>
    );
  if (key.includes("orange"))
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF7900] text-[9px] font-black lowercase text-white">
        orange
      </span>
    );
  const Icon =
    method.type === "bank_transfer" ? Building2 : method.type === "crypto" ? Bitcoin : Smartphone;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-amber-500">
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
  const [limits, setLimits] = useState({ min: 1000, max: 10000000 });

  const selected = methods.find((m) => m.id === methodId);
  const amountNumber = Number(amount);
  const amountError =
    amount && (amountNumber < limits.min || amountNumber > limits.max)
      ? `Enter between ${money(limits.min)} and ${money(limits.max)} FCFA.`
      : "";

  const chips = useMemo(
    () => QUICK_AMOUNTS.filter((v) => v >= limits.min && v <= limits.max).slice(0, 9),
    [limits],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [methodsRes, settingsRes] = await Promise.all([
        supabase
          .from("payment_methods")
          .select("id, type, label, account_name, account_number, instructions")
          .eq("active", true)
          .in("scope", ["deposit", "both"])
          .order("type"),
        supabase
          .from("app_settings")
          .select("deposit_min_amount, deposit_max_amount")
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (methodsRes.error) toast.error("Could not load payment methods.");
      if (mounted && methodsRes.data)
        setMethods(
          methodsRes.data
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
      if (mounted && settingsRes.data)
        setLimits({
          min: Number(settingsRes.data.deposit_min_amount) || 1000,
          max: Number(settingsRes.data.deposit_max_amount) || 10000000,
        });
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
      if (!amount || amountNumber < limits.min || amountNumber > limits.max)
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
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^\w]/g, "");
      const path = `${user.id}/${Date.now()}-${reference}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data, error } = await supabase
        .from("deposits")
        .insert({
          user_id: user.id,
          amount: amountNumber,
          payment_method_id: selected.id,
          reference,
          proof_url: path,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;
      setDepositId(data?.id ?? null);
      void verifyDepositProof({ data: { depositId: data.id } }).catch(() => {});
      setStep(5);
      toast.success("Payment submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your deposit.");
    } finally {
      setSubmitting(false);
    }
  }

  const timer = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  const titles: Record<number, { title: string; sub: string }> = {
    1: { title: "Enter amount", sub: "How much would you like to invest?" },
    2: { title: "Payment method", sub: `You are depositing ${money(amount)} FCFA` },
    3: { title: "Transfer details", sub: "Send the exact amount below" },
    4: { title: "Payment proof", sub: "Upload your payment screenshot" },
    5: { title: "Deposit submitted", sub: "We are verifying your payment" },
  };

  if (loading)
    return (
      <div className="grid h-[100dvh] place-items-center bg-zinc-950 text-zinc-500">
        Loading deposit options…
      </div>
    );

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-zinc-950 px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          aria-label="Go back"
          onClick={() =>
            step > 1 && step < 5 ? setStep((step - 1) as 1 | 2 | 3 | 4) : navigate({ to: "/dashboard" })
          }
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Deposit</h1>
        <div className="w-10" />
      </div>

      {/* Progress */}
      <div className="mt-6 flex shrink-0 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <motion.div
            key={n}
            className={`h-1 flex-1 rounded-full ${Math.min(step, 4) >= n ? "bg-amber-500" : "bg-zinc-800"}`}
            layout
          />
        ))}
      </div>

      {/* Title */}
      <div className="mt-6 shrink-0 text-center">
        <h2 className="text-2xl font-bold">{titles[step].title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{titles[step].sub}</p>
      </div>

      {/* Body */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800/50 bg-zinc-900/50 py-6 backdrop-blur-sm">
                <div className="flex w-full items-baseline justify-center gap-2 px-4">
                  <span className="text-xl font-medium text-zinc-500">FCFA</span>
                  <Input
                    id="deposit-amount"
                    value={amount ? money(amount) : ""}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    inputMode="numeric"
                    aria-label="Amount in FCFA"
                    className="h-auto border-0 bg-transparent p-0 text-center text-[44px] font-bold tracking-tight text-white tabular-nums placeholder:text-zinc-800 focus-visible:ring-0"
                  />
                </div>
                <div className="mt-2 text-xs font-medium uppercase tracking-wider text-amber-500/80">
                  Minimum: {money(limits.min)} XAF
                </div>
              </div>
              {amountError && (
                <p className="mt-3 text-center text-sm text-destructive">{amountError}</p>
              )}
              <div className="mt-6 grid grid-cols-3 gap-3 pb-2">
                {chips.map((value) => {
                  const active = amountNumber === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`rounded-xl border py-3 text-sm font-semibold tabular-nums transition-colors ${
                        active
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                          : "border-zinc-800 bg-zinc-900 text-white hover:border-amber-500/50"
                      }`}
                    >
                      {money(value)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex flex-col gap-3 pb-2"
            >
              {methods.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                  <Clock3 className="h-8 w-8 text-zinc-500" />
                  <h3 className="font-semibold">No payment methods available</h3>
                  <p className="text-sm text-zinc-500">Please check back shortly.</p>
                </div>
              ) : (
                methods.map((m) => {
                  const active = methodId === m.id;
                  return (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      key={m.id}
                      type="button"
                      onClick={() => setMethodId(m.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                        active
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-amber-500/50"
                      }`}
                    >
                      <MethodLogo method={m} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{m.name}</span>
                        <span className="block truncate text-xs text-zinc-500">
                          {m.type === "mobile_money"
                            ? "Mobile Money"
                            : m.type === "bank_transfer"
                              ? "Bank transfer"
                              : "Crypto"}{" "}
                          · Instant
                        </span>
                      </span>
                      {active && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-zinc-950">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          )}

          {step === 3 && selected && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex flex-col gap-3 pb-2"
            >
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
                <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
                  {selected.instructions}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 pt-1 text-amber-500">
                <Clock3 className="h-5 w-5" />
                <span className="text-xl font-bold tabular-nums">{timer}</span>
                <span className="text-xs text-zinc-500">left to pay</span>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="proof"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="pb-2"
            >
              <label
                htmlFor="proof"
                className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-amber-500/40 bg-zinc-900/50 p-6 text-center"
              >
                <Upload className="h-8 w-8 text-amber-500" />
                <span className="text-lg font-semibold text-amber-500">Tap to upload</span>
                <span className="text-xs text-zinc-500">PNG or JPG, up to 5MB</span>
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
              {file && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                  <FileImage className="h-5 w-5 text-amber-500" />
                  <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  <button
                    type="button"
                    aria-label="Remove screenshot"
                    onClick={() => setFile(null)}
                    className="rounded-full p-1 text-zinc-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">
                Depositing <strong className="text-white">{money(amount)} FCFA</strong> via{" "}
                <strong className="text-white">{selected?.name}</strong>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center pb-2 text-center"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-zinc-950"
              >
                <Check className="h-8 w-8" />
              </motion.span>

              <div className="mt-8 flex w-full items-start justify-between gap-2">
                {[
                  ["Uploaded", true],
                  ["Verifying", status === "pending"],
                  ["Credited", status === "approved"],
                ].map(([label, done]) => (
                  <div key={String(label)} className="flex flex-1 flex-col items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        done ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left text-sm">
                <Row label="Amount" value={`${money(amount)} FCFA`} />
                <Row label="Method" value={selected?.name ?? "—"} />
                <Row label="Reference" value={reference} />
              </div>

              <p className="mt-6 text-sm font-semibold">Estimated time: 5–15 minutes</p>
              <p className="mt-1 text-sm text-zinc-500">We’ll notify you once credited</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer action */}
      <div className="shrink-0 pt-4">
        {step === 1 && (
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-sm text-zinc-500">Service fee</span>
            <span className="text-sm font-medium text-zinc-300">0 XAF</span>
          </div>
        )}
        <Button
          onClick={
            step < 4 ? next : step === 4 ? submitProof : () => navigate({ to: "/dashboard" })
          }
          disabled={
            (step === 2 && methods.length === 0) || (step === 4 && (!file || submitting))
          }
          className="h-14 w-full rounded-2xl bg-amber-500 text-base font-bold text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:bg-amber-400 active:scale-[0.98]"
        >
          {step === 3
            ? "I have paid"
            : step === 4
              ? submitting
                ? "Submitting…"
                : "Submit payment"
              : step === 5
                ? "Back to dashboard"
                : "Continue"}
        </Button>
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="text-amber-500"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
      <p
        className={`mt-1 break-words text-xl font-bold tabular-nums ${highlight ? "text-amber-500" : "text-white"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 py-2 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
