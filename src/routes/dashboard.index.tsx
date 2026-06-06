import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, Sparkles, Share2, Copy, Users,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { formatXAF, formatDate } from "@/lib/format";
import { Money } from "@/components/Money";
import { Countdown } from "@/components/Countdown";
import { DateTimeWidget } from "@/components/DateTimeWidget";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

// Animated count-up for the balance hero — feels like a live investing app.
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const delta = value - start;
    if (delta === 0) return;
    const duration = 900;
    const startTs = performance.now();
    let raf = 0;
    const step = (ts: number) => {
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <Money value={Math.round(display)} />;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 22 } },
};


type Profile = {
  full_name: string | null;
  balance: number;
  total_invested: number;
  total_earned: number;
  referral_code: string | null;
  referral_earnings: number | null;
};
type Investment = {
  id: string; amount: number; daily_roi_percent: number; duration_days: number;
  start_date: string; end_date: string; status: string; total_earned: number;
  is_paused: boolean | null; last_payout_at: string | null;
  plans: { name: string; payout_frequency: string } | null;
};

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [chartData, setChartData] = useState<{ d: string; v: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: inv }, { data: tx }, { count: refCount }] = await Promise.all([
        supabase.from("profiles").select("full_name,balance,total_invested,total_earned,referral_code,referral_earnings").eq("id", user.id).maybeSingle(),
        supabase.from("investments").select("*, plans(name,payout_frequency)").eq("user_id", user.id).order("start_date", { ascending: false }).limit(5),
        supabase.from("transactions").select("amount,created_at,type").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("referred_by", user.id),
      ]);
      setProfile(p as Profile);
      setInvestments((inv as Investment[]) ?? []);
      setReferralCount(refCount ?? 0);

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
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("home.welcomeBack")}</p>
        <h1 className="font-display text-2xl text-primary md:text-3xl">{profile?.full_name ?? t("home.investor")}</h1>
      </motion.div>

      <motion.div variants={itemVariants}>
        <DateTimeWidget />
      </motion.div>


      {/* Hero balance card */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-elegant"
      >
        <motion.div
          aria-hidden
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-3xl"
          animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-90">{t("home.availableBalance")}</div>
          <div className="mt-2 font-display text-4xl">
            <AnimatedNumber value={profile?.balance ?? 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/dashboard/deposit" className="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/25 active:scale-95">
              <ArrowDownToLine className="h-4 w-4" /> {t("common.deposit")}
            </Link>
            <Link to="/dashboard/withdraw" className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-primary transition hover:bg-white/90 active:scale-95">
              <ArrowUpFromLine className="h-4 w-4" /> {t("common.withdraw")}
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <StatCard icon={Sparkles} label={t("home.totalProfit")} value={formatXAF(profile?.total_earned ?? 0)} accent="success" />
        <StatCard icon={TrendingUp} label={t("home.activePlans")} value={String(activeCount)} accent="primary" />
      </motion.div>

      {/* Profit chart */}
      <motion.div variants={itemVariants} className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-primary">{t("home.profitGrowth")}</h2>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live · XAF
          </span>
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
      </motion.div>

      {/* Active plans list */}
      <motion.div variants={itemVariants}>
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
            {investments.map((inv, idx) => {
              const freq = inv.plans?.payout_frequency ?? "daily";
              const cycleDays = freq === "daily" ? 1 : freq === "weekly" ? 7 : freq === "monthly" ? 30 : inv.duration_days;
              const last = inv.last_payout_at ? new Date(inv.last_payout_at) : new Date(inv.start_date);
              const nextPayoutMs = last.getTime() + cycleDays * 86400000;
              const endMs = new Date(inv.end_date).getTime();
              const nextPayout = new Date(Math.min(nextPayoutMs, endMs));
              const isActive = inv.status === "active" && !inv.is_paused;
              return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-base text-primary">{inv.plans?.name ?? "Plan"}</div>
                    <div className="text-xs text-muted-foreground">{t("home.ends")} {formatDate(inv.end_date)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                    inv.is_paused ? "bg-warning/15 text-warning" :
                    inv.status === "active" ? "bg-success/15 text-success" :
                    inv.status === "completed" ? "bg-muted text-foreground/70" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {inv.is_paused ? "Suspended" : inv.status}
                  </span>
                </div>
                {isActive && (
                  <div className="mt-3 space-y-2 rounded-xl bg-secondary/50 p-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next profit payout ({freq})</div>
                      <div className="mt-1"><Countdown to={nextPayout} /></div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Investment ends in</span>
                      <Countdown to={inv.end_date} compact />
                    </div>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm">
                  <Mini label={t("home.invested")} v={formatXAF(inv.amount)} />
                  <Mini label={t("home.roi")} v={`${inv.daily_roi_percent}%`} />
                  <Mini label={t("home.earned")} v={formatXAF(inv.total_earned)} accent />
                </div>
              </motion.div>
            );})}
          </div>
        )}
      </motion.div>

      {/* Referral card */}
      <motion.div variants={itemVariants}>
        <ReferralCard
          code={profile?.referral_code ?? null}
          earnings={Number(profile?.referral_earnings ?? 0)}
          count={referralCount}
        />
      </motion.div>
    </motion.div>
  );
}


function ReferralCard({ code, earnings, count }: { code: string | null; earnings: number; count: number }) {
  const link = useMemo(
    () => (code && typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${code}` : ""),
    [code],
  );
  const share = async () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "Join me on SafeGrow", url: link }); return; } catch { /* fall through */ }
    }
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };
  const copy = () => { navigator.clipboard.writeText(link); toast.success("Copied"); };
  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-5">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg text-primary">Refer & earn</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Earn commission on every profit your invitees make.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> Invitees
          </div>
          <div className="mt-1 font-display text-xl text-primary">{count}</div>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Commissions</div>
          <div className="mt-1 font-display text-xl text-success">
            <Money value={earnings} />
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border bg-secondary/50 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your referral link</div>
        <div className="mt-1 truncate font-mono text-xs">{link || "—"}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={copy} disabled={!link}>
          <Copy className="mr-1 h-4 w-4" /> Copy
        </Button>
        <Button size="sm" onClick={share} disabled={!link} className="bg-primary text-primary-foreground hover:opacity-90">
          <Share2 className="mr-1 h-4 w-4" /> Share
        </Button>
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
      <div className="mt-2 font-display text-xl text-primary">
        {/XAF/.test(value) ? <Money value={Number(value.replace(/\D/g, "")) || 0} /> : value}
      </div>

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
