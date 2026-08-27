import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Smartphone, Building2, Bitcoin, ArrowLeft, ArrowRight, Wallet, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/dashboard/deposit")({
  component: DepositPage,
});

type PaymentMethod = {
  id: string;
  type: "mobile_money" | "bank_transfer" | "crypto";
  label: string;
  account_name: string | null;
  account_number: string | null;
  instructions: string | null;
};

const ICONS = { mobile_money: Smartphone, bank_transfer: Building2, crypto: Bitcoin };
const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 250000, 500000];

function DepositPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<string>("");
  const [limits, setLimits] = useState({ min: 1000, max: 10000000 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: settings } = await supabase.from("app_settings").select("deposit_min_amount,deposit_max_amount").eq("id", 1).maybeSingle();
      if (settings) setLimits({ min: Number(settings.deposit_min_amount) || 1000, max: Number(settings.deposit_max_amount) || 10000000 });
      const { data: m } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("active", true)
        .in("scope", ["deposit", "both"])
        .order("type");
      const ms = (m as PaymentMethod[]) ?? [];
      setMethods(ms);
      if (ms[0]) setSelected(ms[0].id);
    })();
  }, [user]);

  const amountNum = Number(amount);
  const canStep1 = amountNum >= limits.min && amountNum <= limits.max;
  const canStep2 = !!selected;

  function goContinue() {
    if (step === 1) {
      if (!canStep1) {
        toast.error(t("deposit.errMin"));
        return;
      }
      setStep(2);
      return;
    }
    if (!canStep2) return;
    // Navigate to a dedicated payment page for the actual transfer + proof upload
    navigate({
      to: "/deposit-payment",
      search: { amount: amountNum, method: selected } as never,
    });
  }

  const stepLabels = [t("deposit.step1"), t("deposit.step2")];

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
            const n = (i + 1) as 1 | 2;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex flex-1 items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span
                  className={`hidden truncate text-[11px] font-medium sm:inline ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 rounded-full ${step > n ? "bg-success" : "bg-muted"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                id="amount"
                type="number"
                inputMode="numeric"
                min={limits.min}
                max={limits.max}
                step={500}
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
              <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("deposit.quickPick")}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                      amountNum === q
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary"
                    }`}
                  >
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
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected(m.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{m.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.account_number}
                      </div>
                    </div>
                    {active && <Check className="h-5 w-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 1 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-9 flex-1 text-xs md:h-10 md:text-sm"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> {t("common.back")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/dashboard" })}
              className="h-9 flex-1 text-xs md:h-10 md:text-sm"
            >
              <Wallet className="mr-1 h-3.5 w-3.5" /> {t("nav.home")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={goContinue}
            disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
            className="h-9 flex-1 bg-primary text-xs text-primary-foreground hover:opacity-90 md:h-10 md:text-sm"
          >
            {t("common.continue")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
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
