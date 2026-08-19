import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, Gauge, ShieldCheck, TrendingUp, Sparkles, Share2, Copy, Users,
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
import { ProfitRobot } from "@/components/ProfitRobot";
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
  const [todayProfit, setTodayProfit] = useState(0);
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
      const todayKey = new Date().toISOString().slice(0, 10);
      let todaySum = 0;
      for (const t of txs) {
        if (t.type !== "profit" && t.type !== "investment_return") continue;
        const day = t.created_at.slice(0, 10);
        acc += Number(t.amount);
        buckets.set(day, acc);
        if (day === todayKey && t.type === "profit") todaySum += Number(t.amount);
      }
      setTodayProfit(todaySum);
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("home.welcomeBack")}</p>
            <h1 className="font-display text-2xl text-primary md:text-3xl">{profile?.full_name ?? t("home.investor")}</h1>
          </div>
          <motion.span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-success"
            animate={{ opacity: [0.72, 1, 0.72] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
          </motion.span>
        </div>
      </motion.div>

      {/* Referral card — above the balance */}
      <motion.div variants={itemVariants}>
        <ReferralCard
          code={profile?.referral_code ?? null}
          earnings={Number(profile?.referral_earnings ?? 0)}
          count={referralCount}
        />
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
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(115deg, transparent 0 42%, color-mix(in oklab, var(--primary-foreground) 42%, transparent) 48%, transparent 54% 100%)",
            backgroundSize: "240% 100%",
          }}
          animate={{ backgroundPosition: ["140% 0%", "-80% 0%"] }}
          transition={{ repeat: Infinity, duration: 5.5, ease: "linear" }}
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-90">{t("home.availableBalance")}</div>
          <div className="mt-2 font-display text-3xl font-bold uppercase tabular-nums leading-tight sm:text-4xl">
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
    </motion.div>
  );
}


function LiveMarketStrip({ balance, earned, activeCount }: { balance: number; earned: number; activeCount: number }) {
  const items = [
    { icon: Activity, label: "Portfolio pulse", value: balance > 0 ? "Growing" : "Ready" },
    { icon: Gauge, label: "Active cycles", value: String(activeCount) },
    { icon: ShieldCheck, label: "Profit paid", value: formatXAF(earned) },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3">
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-success/10 to-transparent"
        animate={{ x: ["-110%", "520%"] }}
        transition={{ repeat: Infinity, duration: 4.8, ease: "linear" }}
      />
      <div className="relative grid grid-cols-3 gap-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              className="rounded-xl bg-secondary/70 p-2.5"
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2.4, delay: index * 0.3, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3 w-3 text-success" />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="mt-1 truncate text-sm font-bold uppercase tabular-nums text-primary">{item.value}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
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
      try { await navigator.share({ title: "Join me on Fidelity", url: link }); return; } catch { /* fall through */ }
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
          <div className="mt-1 font-display text-xl font-bold uppercase tabular-nums text-primary">{count}</div>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Commissions</div>
          <div className="mt-1 font-display text-xl font-bold uppercase tabular-nums text-success">
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
      <div className="mt-2 font-display text-xl font-bold uppercase tabular-nums text-primary">
        {/XAF/.test(value) ? <Money value={Number(value.replace(/\D/g, "")) || 0} /> : value}
      </div>


    </div>
  );
}

function Mini({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold uppercase tabular-nums ${accent ? "text-success" : ""}`}>{v}</div>
    </div>
  );
}

