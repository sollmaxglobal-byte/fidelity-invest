import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  Copy,
  Users,
  TrendingUp,
  Clock,
  Wallet,
  PiggyBank,
  ChevronRight,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { Countdown } from "@/components/Countdown";
import { formatDate, formatXAF } from "@/lib/format";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  referral_code: string | null;
  referral_earnings: number | null;
};

type ActiveInvestment = {
  id: string;
  amount: number;
  total_earned: number;
  start_date: string;
  end_date: string;
  is_paused: boolean;
  plans: { name: string } | null;
};

type ProfitTx = { amount: number; created_at: string };

const RANGES = [
  { key: "1D", hours: 24, points: 12 },
  { key: "1W", hours: 24 * 7, points: 14 },
  { key: "1M", hours: 24 * 30, points: 15 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [investments, setInvestments] = useState<ActiveInvestment[]>([]);
  const [profits, setProfits] = useState<ProfitTx[]>([]);
  const [range, setRange] = useState<RangeKey>("1W");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
      const [{ data: p }, { count: refCount }, { data: inv }, { data: tx }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,balance,referral_code,referral_earnings")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("referred_by", user.id),
        supabase
          .from("investments")
          .select("id,amount,total_earned,start_date,end_date,is_paused,plans(name)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("end_date", { ascending: true }),
        supabase
          .from("transactions")
          .select("amount,created_at")
          .eq("user_id", user.id)
          .in("type", ["profit", "referral"])
          .gte("created_at", since)
          .order("created_at", { ascending: true }),
      ]);
      setProfile(p as Profile);
      setReferralCount(refCount ?? 0);
      setInvestments((inv as unknown as ActiveInvestment[]) ?? []);
      setProfits((tx as ProfitTx[]) ?? []);
    })();
  }, [user]);

  const totalInvested = useMemo(
    () => investments.reduce((s, i) => s + Number(i.amount), 0),
    [investments],
  );
  const totalProfit = useMemo(
    () => investments.reduce((s, i) => s + Number(i.total_earned), 0),
    [investments],
  );

  // Cumulative P/L series for the selected window.
  const { series, windowGain } = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    const end = Date.now();
    const start = end - cfg.hours * 3600 * 1000;
    const step = (end - start) / cfg.points;
    const pts: { t: number; v: number }[] = [];
    let cum = 0;
    let idx = 0;
    const inWindow = profits.filter((p) => new Date(p.created_at).getTime() >= start);
    for (let i = 0; i <= cfg.points; i++) {
      const cut = start + i * step;
      while (idx < inWindow.length && new Date(inWindow[idx]!.created_at).getTime() <= cut) {
        cum += Number(inWindow[idx]!.amount);
        idx++;
      }
      pts.push({ t: cut, v: Math.round(cum) });
    }
    return { series: pts, windowGain: cum };
  }, [profits, range]);

  const up = windowGain >= 0;

  return (
    <motion.div className="space-y-4 pb-4" variants={containerVariants} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("home.welcomeBack")}</p>
          <h1 className="font-display text-xl text-primary md:text-2xl">
            {profile?.full_name ?? t("home.investor")}
          </h1>
        </div>
        <motion.span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success"
          animate={{ opacity: [0.72, 1, 0.72] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
        </motion.span>
      </motion.div>

      {/* Balance + chart card */}
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
      >
        <div className="px-5 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("home.availableBalance")}
          </div>
          <div className="mt-1.5 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            <AnimatedNumber value={profile?.balance ?? 0} />
          </div>
          <div
            className={`mt-1 text-xs font-semibold uppercase tracking-wide ${up ? "text-success" : "text-destructive"}`}
          >
            {up ? "▲" : "▼"} {formatXAF(Math.abs(windowGain))} · {range}
          </div>
        </div>

        {/* P/L chart */}
        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="plFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", (max: number) => (max === 0 ? 1 : max * 1.15)]} />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={() => ""}
                formatter={(v: number) => [formatXAF(v), "P/L"]}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--success)"
                strokeWidth={2.5}
                fill="url(#plFill)"
                isAnimationActive
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Range filters */}
        <div className="flex items-center gap-2 px-5 pb-4 pt-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Quick actions — bottom sheets */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <ActionSheet
          label={t("common.deposit")}
          icon={<ArrowDownToLine className="h-4 w-4" />}
          title={t("common.deposit")}
          description="Fund your account with Mobile Money or bank transfer. Funds appear once approved."
          to="/dashboard/deposit"
          cta={t("common.deposit")}
          primary
        />
        <ActionSheet
          label={t("common.withdraw")}
          icon={<ArrowUpFromLine className="h-4 w-4" />}
          title={t("common.withdraw")}
          description="Minimum withdrawal is 250 XAF. Payouts are processed within 10 minutes."
          to="/dashboard/withdraw"
          cta={t("common.withdraw")}
        />
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <PiggyBank className="h-3.5 w-3.5" /> Invested
          </div>
          <div className="mt-1.5 text-lg text-foreground">
            <Money value={totalInvested} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Profit
          </div>
          <div className="mt-1.5 text-lg text-success">
            <Money value={totalProfit} />
          </div>
        </div>
      </motion.div>

      {/* Referral card */}
      <motion.div variants={itemVariants}>
        <ReferralCard
          code={profile?.referral_code ?? null}
          earnings={Number(profile?.referral_earnings ?? 0)}
          count={referralCount}
        />
      </motion.div>

      {/* Active investments with progress */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg text-primary">Active investments</h2>
        </div>
        {investments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active plan yet.{" "}
            <Link to="/dashboard/invest" className="font-medium text-primary underline">
              Start investing
            </Link>
          </div>
        ) : (
          investments.map((inv) => <InvestmentCard key={inv.id} inv={inv} />)
        )}
      </motion.div>
    </motion.div>
  );
}

function InvestmentCard({ inv }: { inv: ActiveInvestment }) {
  const start = new Date(inv.start_date).getTime();
  const end = new Date(inv.end_date).getTime();
  const pct = Math.max(0, Math.min(100, ((Date.now() - start) / Math.max(1, end - start)) * 100));
  return (
    <motion.div whileTap={{ scale: 0.99 }} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-base text-primary">{inv.plans?.name ?? "Investment plan"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <Money value={Number(inv.amount)} /> ·{" "}
            <span className="text-success">
              <Money value={Number(inv.total_earned)} />
            </span>{" "}
            earned
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            inv.is_paused ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"
          }`}
        >
          {inv.is_paused ? "Paused" : "Running"}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-success"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{Math.round(pct)}% complete</span>
          <span>Ends {formatDate(inv.end_date)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-secondary/60 p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" /> Expires in
        </div>
        <div className="mt-2">
          <Countdown to={inv.end_date} />
        </div>
      </div>
    </motion.div>
  );
}

function ActionSheet({
  label,
  icon,
  title,
  description,
  to,
  cta,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition active:scale-95 ${
            primary
              ? "bg-primary text-primary-foreground shadow-elegant"
              : "border border-border bg-card text-foreground"
          }`}
        >
          {icon} {label}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-primary">{title}</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <Button asChild size="lg" className="mt-4 w-full rounded-xl">
          <Link to={to as never}>
            {cta} <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function ReferralCard({ code, earnings, count }: { code: string | null; earnings: number; count: number }) {
  const link = useMemo(
    () => (code && typeof window !== "undefined" ? `${window.location.origin}/register?ref=${code}` : ""),
    [code],
  );
  const share = async () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Join me on Fidelity", url: link });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };
  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Copied");
  };
  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-5">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg text-primary">Refer &amp; earn</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Earn commission on every profit your invitees make.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" /> Total referrals
          </div>
          <div className="mt-1 font-display text-xl font-bold uppercase tabular-nums text-primary">{count}</div>
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
      <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
        <Link to="/dashboard/referrals">
          <Users className="mr-1 h-4 w-4" /> My referrals
        </Link>
      </Button>
    </div>
  );
}
