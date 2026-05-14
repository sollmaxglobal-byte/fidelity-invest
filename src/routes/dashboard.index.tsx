import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { formatXAF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

type Profile = {
  full_name: string | null;
  balance: number;
  total_invested: number;
  total_earned: number;
};
type Investment = {
  id: string; amount: number; daily_roi_percent: number; duration_days: number;
  start_date: string; end_date: string; status: string; total_earned: number;
  plans: { name: string } | null;
};

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [chartData, setChartData] = useState<{ d: string; v: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: inv }, { data: tx }] = await Promise.all([
        supabase.from("profiles").select("full_name,balance,total_invested,total_earned").eq("id", user.id).maybeSingle(),
        supabase.from("investments").select("*, plans(name)").eq("user_id", user.id).order("start_date", { ascending: false }).limit(5),
        supabase.from("transactions").select("amount,created_at,type").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      setProfile(p as Profile);
      setInvestments((inv as Investment[]) ?? []);

      // Build cumulative profit chart from "profit" transactions
      const buckets = new Map<string, number>();
      let acc = 0;
      const txs = (tx ?? []) as { amount: number; created_at: string; type: string }[];
      for (const t of txs) {
        if (t.type !== "profit" && t.type !== "investment_return") continue;
        const day = t.created_at.slice(0, 10);
        acc += Number(t.amount);
        buckets.set(day, acc);
      }
      // If no profits yet, generate flat zero-line over last 7 days
      let series = Array.from(buckets, ([d, v]) => ({ d, v }));
      if (series.length < 2) {
        const today = new Date();
        series = Array.from({ length: 7 }, (_, i) => {
          const dt = new Date(today.getTime() - (6 - i) * 86400000);
          return { d: dt.toISOString().slice(0, 10), v: 0 };
        });
      }
      setChartData(series);
    })();
  }, [user]);

  const activeCount = investments.filter((i) => i.status === "active").length;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("home.welcomeBack")}</p>
        <h1 className="font-display text-2xl text-primary md:text-3xl">{profile?.full_name ?? t("home.investor")}</h1>
      </div>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-elegant">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider opacity-80">{t("home.availableBalance")}</div>
          <div className="mt-2 font-display text-4xl">{formatXAF(profile?.balance ?? 0)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/dashboard/deposit" className="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/25">
              <ArrowDownToLine className="h-4 w-4" /> {t("common.deposit")}
            </Link>
            <Link to="/dashboard/withdraw" className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-primary transition hover:bg-white/90">
              <ArrowUpFromLine className="h-4 w-4" /> {t("common.withdraw")}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Sparkles} label={t("home.totalProfit")} value={formatXAF(profile?.total_earned ?? 0)} accent="success" />
        <StatCard icon={TrendingUp} label={t("home.activePlans")} value={String(activeCount)} accent="primary" />
      </div>

      {/* Profit chart */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">{t("home.profitGrowth")}</h2>
          <span className="text-xs text-muted-foreground">XAF</span>
        </div>
        <div className="mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.5 0.09 160)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.5 0.09 160)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" hide />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatXAF(Number(v)), t("wallet.profit")]}
                labelFormatter={(l) => formatDate(String(l))}
              />
              <Area type="monotone" dataKey="v" stroke="oklch(0.5 0.09 160)" strokeWidth={2} fill="url(#profit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active plans list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">{t("home.yourPlans")}</h2>
          <Link to="/dashboard/invest" className="text-xs font-medium text-primary hover:underline">{t("home.newInvestment")}</Link>
        </div>
        {investments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("home.noInvestments")} <Link to="/dashboard/invest" className="font-medium text-primary underline">{t("home.activatePlan")}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {investments.map((inv) => (
              <div key={inv.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-base text-primary">{inv.plans?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground">{t("home.ends")} {formatDate(inv.end_date)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                    inv.status === "active" ? "bg-success/15 text-success" :
                    inv.status === "completed" ? "bg-muted text-foreground/70" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {inv.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm">
                  <Mini label={t("home.invested")} v={formatXAF(inv.amount)} />
                  <Mini label={t("home.roi")} v={`${inv.daily_roi_percent}%`} />
                  <Mini label={t("home.earned")} v={formatXAF(inv.total_earned)} accent />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: typeof Sparkles; label: string; value: string; accent: "success" | "primary" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          accent === "success" ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
        }`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl text-primary">{value}</div>
    </div>
  );
}

function Mini({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${accent ? "text-success" : ""}`}>{v}</div>
    </div>
  );
}
