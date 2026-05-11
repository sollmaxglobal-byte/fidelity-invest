import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
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
};

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
      if (ps[0]) { setPlanId(ps[0].id); setAmount(ps[0].min_amount); }
      setBalance(Number(prof?.balance ?? 0));
    })();
  }, [user]);

  const plan = plans.find((p) => p.id === planId);
  const projection = useMemo(() => {
    if (!plan) return null;
    const dailyROI = (amount * plan.daily_roi_percent) / 100;
    const total = dailyROI * plan.duration_days;
    return { dailyROI, total, finalBalance: amount + total };
  }, [plan, amount]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !plan) return;
    setBusy(true);
    try {
      const schema = z.object({
        amount: z.number().min(plan.min_amount, `Min ${formatXAF(plan.min_amount)}`).max(plan.max_amount, `Max ${formatXAF(plan.max_amount)}`),
      });
      schema.parse({ amount });
      if (amount > balance) throw new Error("Insufficient balance — make a deposit first");

      const end = new Date(Date.now() + plan.duration_days * 86_400_000).toISOString();
      const { data: inv, error } = await supabase.from("investments").insert({
        user_id: user.id, plan_id: plan.id, amount,
        daily_roi_percent: plan.daily_roi_percent,
        duration_days: plan.duration_days,
        end_date: end,
        status: "active",
      }).select().single();
      if (error) throw error;

      const { data: prof } = await supabase.from("profiles").select("balance,total_invested").eq("id", user.id).single();
      await supabase.from("profiles").update({
        balance: Number(prof?.balance ?? 0) - amount,
        total_invested: Number(prof?.total_invested ?? 0) + amount,
      }).eq("id", user.id);
      await supabase.from("transactions").insert({
        user_id: user.id, type: "investment", amount: -amount,
        description: `Invested in ${plan.name}`, ref_id: inv?.id,
      });
      if (user.email) {
        sendEmail({
          to: user.email,
          template_key: "investment_started",
          variables: {
            name: user.user_metadata?.full_name ?? "Investor",
            amount: amount.toLocaleString("fr-CM"),
            plan: plan.name,
            roi: plan.daily_roi_percent,
            days: plan.duration_days,
          },
        });
      }
      toast.success("Investment created — earnings will accrue daily");
      setBalance((b) => b - amount);
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary md:text-4xl">New investment</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a plan and any amount within its range.</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-2 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet</div>
          <div className="font-display text-xl text-primary">{formatXAF(balance)}</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const active = p.id === planId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPlanId(p.id); setAmount(p.min_amount); }}
              className={`rounded-2xl border p-5 text-left transition ${
                active ? "border-gold bg-primary text-primary-foreground shadow-elegant" : "border-border bg-card hover:border-primary"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl">{p.name}</span>
                <TrendingUp className={`h-5 w-5 ${active ? "text-gold" : "text-primary"}`} />
              </div>
              <div className={`mt-2 text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>
                {formatXAF(p.min_amount)} – {formatXAF(p.max_amount)}
              </div>
              <div className={`mt-3 font-display text-3xl ${active ? "text-gold" : "text-accent"}`}>
                {p.daily_roi_percent}%
                <span className="ml-1 text-xs uppercase opacity-70">/ day · {p.duration_days}d</span>
              </div>
            </button>
          );
        })}
      </div>

      {plan && (
        <form onSubmit={onSubmit} className="grid gap-6 rounded-2xl border border-border bg-card p-5 md:grid-cols-2 md:p-7">
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount to invest (XAF)</Label>
              <Input
                id="amount" type="number" required
                min={plan.min_amount} max={plan.max_amount} step={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Min {formatXAF(plan.min_amount)} • Max {formatXAF(plan.max_amount)}
              </div>
            </div>

            {balance < amount && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                Your wallet is below the chosen amount.{" "}
                <Link to="/dashboard/deposit" className="font-medium underline">Top up →</Link>
              </div>
            )}

            <Button type="submit" disabled={busy || !projection} className="w-full bg-gold text-gold-foreground hover:opacity-90">
              {busy ? "Creating…" : "Confirm investment"}
            </Button>
          </div>

          {projection && (
            <div className="rounded-xl bg-secondary p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Projection</div>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Daily earnings" value={formatXAF(projection.dailyROI)} />
                <Row label="Duration" value={`${plan.duration_days} days`} />
                <Row label="Total ROI" value={formatXAF(projection.total)} accent />
                <div className="my-3 border-t border-border" />
                <Row label="Capital + ROI" value={formatXAF(projection.finalBalance)} bold />
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function Row({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${accent ? "text-success" : ""} ${bold ? "font-display text-lg text-primary" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
