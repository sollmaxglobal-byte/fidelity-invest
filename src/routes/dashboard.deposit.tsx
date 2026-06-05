import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Smartphone, Building2, Bitcoin, Upload, Copy, Check, ArrowLeft, ArrowRight, Wallet, CheckCircle2, Home, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { sendEmail } from "@/lib/email-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/dashboard/deposit")({
  component: DepositPage,
});

type PaymentMethod = {
  id: string; type: "mobile_money" | "bank_transfer" | "crypto";
  label: string; account_name: string | null; account_number: string | null; instructions: string | null;
};

const ICONS = { mobile_money: Smartphone, bank_transfer: Building2, crypto: Bitcoin };
const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000, 500000];

const schema = z.object({
  amount: z.number().min(1000),
  payment_method_id: z.string().uuid(),
});

function DepositPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: m } = await supabase
        .from("payment_methods").select("*").eq("active", true).order("type");
      const ms = (m as PaymentMethod[]) ?? [];
      setMethods(ms);
      if (ms[0]) setSelected(ms[0].id);
    })();
  }, [user]);

  const sel = methods.find((m) => m.id === selected);
  const amountNum = Number(amount);
  const canStep1 = amountNum >= 1000;
  const canStep2 = !!selected;

  function next() {
    if (step === 1 && !canStep1) { toast.error(t("deposit.errMin")); return; }
    if (step === 2 && !canStep2) return;
    setStep((s) => (Math.min(4, (s + 1)) as 1 | 2 | 3 | 4));
  }
  function back() { setStep((s) => (Math.max(1, (s - 1)) as 1 | 2 | 3 | 4)); }

  async function onSubmit() {
    if (!user) return;
    if (!file) { toast.error(t("deposit.errNoFile")); return; }
    setBusy(true);

    const retry = async <T,>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
      let lastErr: unknown;
      for (let i = 0; i < attempts; i++) {
        try { return await fn(); }
        catch (e) {
          lastErr = e;
          const msg = (e as Error)?.message ?? "";
          if (!/fetch|network|load failed/i.test(msg)) throw e;
          await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        }
      }
      throw lastErr;
    };

    try {
      const v = schema.parse({ amount: amountNum, payment_method_id: selected });
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      await retry(async () => {
        const { error: upErr } = await supabase.storage.from("payment-proofs")
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (upErr) throw upErr;
      });
      const method = methods.find((m) => m.id === v.payment_method_id);
      let depositId = "";
      await retry(async () => {
        const { data: inserted, error } = await supabase.from("deposits").insert({
          user_id: user.id,
          amount: v.amount,
          payment_method_id: v.payment_method_id,
          proof_url: path,
          status: "pending",
        }).select("id").single();
        if (error) throw error;
        depositId = inserted!.id as string;
      });
      if (user.email) {
        sendEmail({
          to: user.email,
          template_key: "deposit_submitted",
          variables: {
            name: user.user_metadata?.full_name ?? "Investor",
            amount: String(v.amount),
            method: method?.label ?? "—",
          },
        });
      }
      toast.success(t("deposit.submitted"));
      navigate({ to: "/dashboard/deposit/pending/$id", params: { id: depositId } });
      return;
    } catch (err) {
      const raw = (err as Error).message ?? "Error";
      const friendly = /fetch|network|load failed/i.test(raw)
        ? "Network problem. Please check your connection and try again."
        : raw;
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  }

  const stepLabels = [t("deposit.step1"), t("deposit.step2"), t("deposit.step3"), t("deposit.step4")];

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-28 md:pb-6">
      <div>
        <h1 className="font-display text-2xl text-primary md:text-3xl">{t("deposit.title")}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("deposit.subtitle")}</p>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-1.5">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3 | 4;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex flex-1 items-center gap-1.5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span className={`hidden truncate text-[11px] font-medium sm:inline ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < 3 && <div className={`h-0.5 flex-1 rounded-full ${step > n ? "bg-success" : "bg-muted"}`} />}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground sm:hidden">
          {t("deposit.step")} {step} {t("deposit.of")} 4 — {stepLabels[step - 1]}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border bg-card p-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg text-primary">{t("deposit.amountTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("deposit.amountSub")}</p>
            </div>
            <div>
              <Label htmlFor="amount">{t("common.amount")}</Label>
              <Input
                id="amount" type="number" inputMode="numeric" min={1000} step={500}
                placeholder={t("deposit.amountPlaceholder")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-14 text-2xl font-semibold"
              />
              {amountNum > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  ≈ <span className="font-semibold text-primary">{formatXAF(amountNum)}</span>
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{t("deposit.quickPick")}</div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {QUICK_AMOUNTS.map((q) => (
                  <button key={q} type="button" onClick={() => setAmount(String(q))}
                    className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                      amountNum === q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary"
                    }`}>
                    {q.toLocaleString("en-US").replace(/,/g, " ")}
                  </button>
                ))}

              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg text-primary">{t("deposit.methodTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("deposit.methodSub")}</p>
            </div>
            <div className="space-y-2">
              {methods.map((m) => {
                const Icon = ICONS[m.type];
                const active = m.id === selected;
                return (
                  <button key={m.id} type="button" onClick={() => setSelected(m.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary"
                    }`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{m.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.account_number}</div>
                    </div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && sel && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg text-primary">{t("deposit.payTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("deposit.paySub")}</p>
            </div>
            <div className="rounded-xl bg-primary/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("deposit.amountToSend")}</div>
              <div className="mt-1 font-display text-3xl text-primary">{formatXAF(amountNum)}</div>
            </div>
            <div className="space-y-2">
              <CopyRow label={t("deposit.sendTo")} value={sel.label} />
              <CopyRow label={t("deposit.accountName")} value={sel.account_name ?? ""} />
              <CopyRow label={t("deposit.accountNumber")} value={sel.account_number ?? ""} />
            </div>
            {sel.instructions && (
              <div className="rounded-lg bg-secondary p-3 text-sm leading-relaxed">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">{t("deposit.instructions")}</div>
                {sel.instructions}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg text-primary">{t("deposit.proofTitle")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("deposit.proofSub")}</p>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background p-8 text-center hover:border-primary">
              {file ? (
                <>
                  <Check className="h-10 w-10 text-success" />
                  <div className="text-sm font-medium text-foreground">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-sm font-medium text-foreground">{t("deposit.proofPlaceholder")}</div>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("common.amount")}</span>
                <span className="font-semibold text-primary">{formatXAF(amountNum)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">{t("common.method")}</span>
                <span className="font-medium">{sel?.label ?? "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={back} className="flex-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })} className="flex-1">
              <Wallet className="mr-1 h-4 w-4" /> {t("nav.home")}
            </Button>
          )}
          {step < 4 ? (
            <Button type="button" onClick={next} disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90">
              {step === 3 ? t("deposit.iHavePaid") : t("common.continue")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit} disabled={busy || !file}
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90">
              {busy ? t("deposit.submitting") : t("deposit.submit")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={success} onOpenChange={(o) => { if (!o) navigate({ to: "/dashboard" }); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <DialogTitle className="font-display text-xl text-primary">
              {t("deposit.successTitle") ?? "Deposit submitted successfully"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("deposit.successDesc") ?? "Your deposit is awaiting admin approval. You'll be notified once it's confirmed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("common.amount")}</span>
              <span className="font-display text-lg text-primary">{formatXAF(amountNum)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("common.status") ?? "Status"}</span>
              <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                {t("status.pending") ?? "Pending"}
              </span>
            </div>
            {sel && (
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("common.method")}</span>
                <span className="text-sm font-medium">{sel.label}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Button asChild className="w-full bg-primary text-primary-foreground hover:opacity-90">
              <Link to="/dashboard"><Home className="mr-2 h-4 w-4" /> {t("deposit.returnHome") ?? "Return to dashboard"}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard/wallet" search={{ filter: "Deposits" } as never}>
                <History className="mr-2 h-4 w-4" /> {t("deposit.viewHistory") ?? "View deposit history"}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm font-medium">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
