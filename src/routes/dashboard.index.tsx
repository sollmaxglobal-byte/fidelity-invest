import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, Share2, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { Money } from "@/components/Money";
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
  referral_code: string | null;
  referral_earnings: number | null;
};

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count: refCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,balance,referral_code,referral_earnings")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("referred_by", user.id),
      ]);
      setProfile(p as Profile);
      setReferralCount(refCount ?? 0);
    })();
  }, [user]);

  return (
    <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("home.welcomeBack")}</p>
            <h1 className="font-display text-2xl text-primary md:text-3xl">
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
        </div>
      </motion.div>

      {/* Referral card — sits above the balance */}
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
            backgroundImage:
              "linear-gradient(115deg, transparent 0 42%, color-mix(in oklab, var(--primary-foreground) 42%, transparent) 48%, transparent 54% 100%)",
            backgroundSize: "240% 100%",
          }}
          animate={{ backgroundPosition: ["140% 0%", "-80% 0%"] }}
          transition={{ repeat: Infinity, duration: 5.5, ease: "linear" }}
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-90">
            {t("home.availableBalance")}
          </div>
          <div className="mt-2 font-display text-3xl font-bold uppercase tabular-nums leading-tight sm:text-4xl">
            <AnimatedNumber value={profile?.balance ?? 0} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              to="/dashboard/deposit"
              className="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/25 active:scale-95"
            >
              <ArrowDownToLine className="h-4 w-4" /> {t("common.deposit")}
            </Link>
            <Link
              to="/dashboard/withdraw"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-primary transition hover:bg-white/90 active:scale-95"
            >
              <ArrowUpFromLine className="h-4 w-4" /> {t("common.withdraw")}
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
      <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
        <Link to="/dashboard/referrals">
          <Users className="mr-1 h-4 w-4" /> My referrals
        </Link>
      </Button>
    </div>
  );
}
