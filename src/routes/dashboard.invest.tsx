import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendEmail } from "@/lib/email-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/dashboard/invest")({
  component: InvestPage,
});

type Plan = {
  id: string; name: string; description: string | null;
  min_amount: number; max_amount: number; daily_roi_percent: number; duration_days: number;
  profit_type: "percent" | "fixed"; fixed_daily_profit: number;
  payout_frequency: "daily" | "weekly" | "monthly" | "end_of_term";
  amount_type: "range" | "fixed"; fixed_amount: number;
};


const POPULAR = "Growth Plan";

function InvestPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState(0);
  const [planId, setPlanId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: prof }] = await Promise.all([
        supabase.from("plans").select("*").eq("active", true).order("min_amount"),
        supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle(),
      ]);
      const ps = (p as Plan[]) ?? [];
      setPlans(ps);
      setBalance(Number(prof?.balance ?? 0));
    })();
  }, [user]);

  const plan = plans.find((p) => p.id === planId);
  const projection = useMemo(() => {
    if (!plan) return null;
    const dailyProfit = plan.profit_type === "fixed"
      ? Number(plan.fixed_daily_profit)
      : (amount * Number(plan.daily_roi_percent)) / 100;
    const profit = dailyProfit * plan.duration_days;
    return { dailyProfit, profit, payout: amount + profit };
  }, [plan, amount]);


  function activate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !plan) return;
    setBusy(true);
    try {
      const min = plan.amount_type === "fixed" ? plan.fixed_amount : plan.min_amount;
      const max = plan.amount_type === "fixed" ? plan.fixed_amount : plan.max_amount;
      const schema = z.object({
        amount: z.number()
          .min(min, `Min ${formatXAF(min)}`)
          .max(max, `Max ${formatXAF(max)}`),
      });
      schema.parse({ amount });
      if (amount > balance) throw new Error("Insufficient wallet balance — make a deposit first");

      const url = `/invest/confirm/${plan.id}?amount=${amount}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) window.location.href = url;
      setPlanId("");
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-primary md:text-3xl">Investment plans</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Capital + profit paid at end of term.</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</div>
          <div className="font-display text-base text-primary">{formatXAF(balance)}</div>
        </div>
      </div>

      <div className="space-y-4">
        {plans.map((p) => {
          const popular = p.name === POPULAR;
          return (
            <div key={p.id} className={`relative rounded-2xl border p-5 ${
              popular ? "border-primary bg-card shadow-elegant" : "border-border bg-card"
            }`}>
              {popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Popular
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-xl text-primary">{p.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-3xl text-success">
                      {p.profit_type === "fixed" ? formatXAF(p.fixed_daily_profit) : `${p.daily_roi_percent}%`}
                    </span>
                    <span className="text-xs text-muted-foreground">/ day · {p.duration_days} days</span>
                  </div>
                  <div className="mt-1 inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                    Paid {(p.payout_frequency ?? "daily").replace("_", " ")}
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {p.amount_type === "fixed" ? (
                  <div className="col-span-2 rounded-lg bg-secondary p-2">
                    <div className="text-muted-foreground">Fixed amount</div>
                    <div className="font-medium">{formatXAF(p.fixed_amount)}</div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg bg-secondary p-2">
                      <div className="text-muted-foreground">Min</div>
                      <div className="font-medium">{formatXAF(p.min_amount)}</div>
                    </div>
                    <div className="rounded-lg bg-secondary p-2">
                      <div className="text-muted-foreground">Max</div>
                      <div className="font-medium">{formatXAF(p.max_amount)}</div>
                    </div>
                  </>
                )}
              </div>
              <Button
                onClick={() => { setPlanId(p.id); setAmount(p.amount_type === "fixed" ? p.fixed_amount : p.min_amount); }}
                className="mt-4 w-full bg-primary text-primary-foreground hover:opacity-90"
              >
                Activate
              </Button>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Profit paid {(p.payout_frequency ?? "daily").replace("_", " ")}. Investments carry risk.
              </p>
            </div>
          );
        })}
      </div>

      {plan && (
        <form onSubmit={activate} className="rounded-2xl border border-primary bg-card p-5 shadow-elegant">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Activate</div>
          <div className="font-display text-xl text-primary">{plan.name}</div>

          <div className="mt-4">
            <Label htmlFor="amount">Amount (XAF)</Label>
            <Input
              id="amount" type="number" required
              min={plan.amount_type === "fixed" ? plan.fixed_amount : plan.min_amount}
              max={plan.amount_type === "fixed" ? plan.fixed_amount : plan.max_amount}
              step={plan.amount_type === "fixed" ? undefined : 500}
              readOnly={plan.amount_type === "fixed"}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {plan.amount_type === "fixed"
                ? `Fixed at ${formatXAF(plan.fixed_amount)}`
                : `Min ${formatXAF(plan.min_amount)} · Max ${formatXAF(plan.max_amount)}`}
            </div>
          </div>

          {projection && (
            <div className="mt-4 space-y-1 rounded-xl bg-secondary p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Daily profit</span><span className="font-medium text-success">{formatXAF(projection.dailyProfit)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total profit ({plan.duration_days} days)</span><span className="font-medium text-success">{formatXAF(projection.profit)}</span></div>
              <div className="mt-1 flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Payout at end</span><span className="font-display text-base text-primary">{formatXAF(projection.payout)}</span></div>
            </div>
          )}


          {balance < amount && (
            <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs">
              Wallet too low. <Link to="/dashboard/deposit" className="font-medium underline">Top up →</Link>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setPlanId("")} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-primary text-primary-foreground hover:opacity-90">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {busy ? "Activating…" : "Confirm"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
