import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatXAF, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

type Profile = { full_name: string | null; balance: number; total_invested: number; total_earned: number };
type Investment = {
  id: string; amount: number; daily_roi_percent: number; duration_days: number;
  start_date: string; end_date: string; status: string; total_earned: number;
  plans: { name: string } | null;
};

function DashboardOverview() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [pending, setPending] = useState({ deposits: 0, withdrawals: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: inv }, { count: dc }, { count: wc }] = await Promise.all([
        supabase.from("profiles").select("full_name,balance,total_invested,total_earned").eq("id", user.id).maybeSingle(),
        supabase.from("investments").select("*, plans(name)").eq("user_id", user.id).order("start_date", { ascending: false }).limit(5),
        supabase.from("deposits").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
        supabase.from("withdrawals").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
      ]);
      setProfile(p as Profile);
      setInvestments((inv as Investment[]) ?? []);
      setPending({ deposits: dc ?? 0, withdrawals: wc ?? 0 });
    })();
  }, [user]);

  const stats = [
    { label: "Wallet balance", value: formatXAF(profile?.balance ?? 0), icon: Wallet, accent: true },
    { label: "Active capital", value: formatXAF(profile?.total_invested ?? 0), icon: TrendingUp },
    { label: "Total earned", value: formatXAF(profile?.total_earned ?? 0), icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-3xl text-primary md:text-4xl">
          {profile?.full_name ?? "Investor"}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border p-5 ${
              s.accent
                ? "border-gold bg-hero text-primary-foreground shadow-elegant"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider ${s.accent ? "text-gold" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              <s.icon className={`h-4 w-4 ${s.accent ? "text-gold" : "text-muted-foreground"}`} />
            </div>
            <div className="mt-3 font-display text-3xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:opacity-90">
          <Link to="/dashboard/deposit"><ArrowDownToLine className="mr-2 h-4 w-4" />Deposit</Link>
        </Button>
        <Button asChild size="lg" className="bg-gold text-gold-foreground hover:opacity-90">
          <Link to="/dashboard/invest"><TrendingUp className="mr-2 h-4 w-4" />Invest</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/dashboard/withdraw"><ArrowUpFromLine className="mr-2 h-4 w-4" />Withdraw</Link>
        </Button>
      </div>

      {(pending.deposits > 0 || pending.withdrawals > 0) && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          You have <strong>{pending.deposits}</strong> pending deposit{pending.deposits !== 1 ? "s" : ""} and{" "}
          <strong>{pending.withdrawals}</strong> pending withdrawal{pending.withdrawals !== 1 ? "s" : ""} awaiting review.
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-primary">Your investments</h2>
          <Link to="/dashboard/history" className="text-sm text-accent hover:underline">View history</Link>
        </div>
        {investments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No investments yet. <Link to="/dashboard/invest" className="text-primary underline">Start your first plan →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {investments.map((inv) => (
              <div key={inv.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg text-primary">{inv.plans?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground">
                      Started {formatDate(inv.start_date)} • Ends {formatDate(inv.end_date)}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    inv.status === "active" ? "bg-success/15 text-success" :
                    inv.status === "completed" ? "bg-muted text-foreground/70" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {inv.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-4 border-t border-border pt-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Invested</div>
                    <div className="font-medium">{formatXAF(inv.amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Daily</div>
                    <div className="font-medium">{inv.daily_roi_percent}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Earned</div>
                    <div className="font-medium text-success">{formatXAF(inv.total_earned)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
