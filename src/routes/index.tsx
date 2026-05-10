import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, TrendingUp, Wallet, Clock, BadgeCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(201,168,76,0.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(201,168,76,0.25), transparent 45%)",
        }} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-gold">
              <BadgeCheck className="h-3.5 w-3.5" /> Cameroonian Capital · Global Returns
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
              Grow your capital, <span className="text-gold italic">the right way</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-85 md:text-xl">
              Camvcc is a curated investment platform offering daily XAF returns through verified
              mobile money, bank, and crypto channels.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold text-gold-foreground shadow-gold hover:opacity-90">
                <Link to="/auth">
                  Open an account <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link to="/plans">View plans</Link>
              </Button>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
              {[
                { k: "12,400+", v: "Active investors" },
                { k: "XAF 2.4B", v: "Paid out" },
                { k: "99.8%", v: "On-time payouts" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-2xl text-gold md:text-3xl">{s.k}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider opacity-70">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Why Camvcc</div>
          <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">
            Engineered for trust. Designed for growth.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { i: ShieldCheck, t: "Manual verification", d: "Every deposit is reviewed by a real person — no automated fraud, no surprises." },
            { i: TrendingUp, t: "Daily returns", d: "Earn between 2.5% and 4.5% per day on your principal, paid into your account daily." },
            { i: Wallet, t: "Local rails", d: "Deposit by MTN, Orange Money, bank transfer or USDT. Withdraw the way you deposited." },
            { i: Clock, t: "15–40 day cycles", d: "Short, transparent investment windows so you stay in control of your capital." },
            { i: Users, t: "Real support", d: "A Cameroonian team you can reach by phone, WhatsApp or email — same-day response." },
            { i: BadgeCheck, t: "Transparent pricing", d: "No hidden fees. The amount you deposit is the amount that earns." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-gold hover:shadow-elegant">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-2xl text-primary">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-4xl text-primary md:text-5xl">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Open account", "Register in under a minute with your phone and email."],
              ["02", "Fund your wallet", "Send Mobile Money, bank transfer or USDT. Upload proof."],
              ["03", "Pick a plan", "Choose Starter, Growth or Prestige — set any amount."],
              ["04", "Earn daily", "Returns hit your wallet every 24h. Withdraw any time."],
            ].map(([n, t, d]) => (
              <div key={n} className="relative">
                <div className="font-display text-6xl text-gold/70">{n}</div>
                <h3 className="mt-2 font-display text-xl text-primary">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:opacity-90">
              <Link to="/auth">Start now <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
