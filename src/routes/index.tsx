import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, ShieldCheck, TrendingUp, Wallet, Clock,
  CheckCircle2, ChevronDown, Leaf,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeGrow Invest — Grow Your Money Safely" },
      { name: "description", content: "Transparent XAF investment plans with manual mobile money payments. Starter, Growth and Premium plans from 5,000 XAF." },
    ],
  }),
  component: Index,
});

const PLANS = [
  { name: "Starter Plan", roi: 12, days: 14, min: 5000, max: 50000, badge: null },
  { name: "Growth Plan", roi: 30, days: 30, min: 25000, max: 300000, badge: "Popular" },
  { name: "Premium Plan", roi: 75, days: 60, min: 100000, max: 1000000, badge: null },
];

const FAQ = [
  {
    q: "How are payments processed?",
    a: "Manually. You send money via MTN Mobile Money or Orange Money to our official number, upload your screenshot, and our team approves it within 24 hours.",
  },
  {
    q: "When do I receive my profit?",
    a: "Both your capital and your profit are credited to your wallet at the end of the plan's term (14, 30, or 60 days depending on the plan).",
  },
  {
    q: "Can I withdraw any time?",
    a: "Your wallet balance is always available to withdraw. Funds locked in an active plan are released at the end of the term.",
  },
  {
    q: "Is there any fee?",
    a: "No deposit or withdrawal fees. The amount you deposit is the amount that earns.",
  },
  {
    q: "Is this safe?",
    a: "We are not a licensed financial institution and all investments carry risk. Only invest what you can afford to lose.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(120,200,150,0.35), transparent 40%), radial-gradient(circle at 85% 80%, rgba(80,180,140,0.25), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/90">
              <Leaf className="h-3.5 w-3.5" /> Trusted by Cameroonian investors
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
              Grow your money <span className="italic text-success">safely</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-85 md:text-xl">
              Pick a plan, fund it with Mobile Money, and receive your capital plus profit at the end of the term — all in XAF.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth">
                  Start investing <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <a href="#plans">View plans</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Investment plans</div>
          <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">
            Three plans. One simple promise.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">Capital + profit paid at the end of the term.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 transition ${
                p.badge ? "border-primary bg-card shadow-elegant md:scale-105" : "border-border bg-card hover:border-primary"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {p.badge}
                </span>
              )}
              <div className="font-display text-2xl text-primary">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl text-success">{p.roi}%</span>
                <span className="text-sm text-muted-foreground">total ROI</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{p.days} days · paid at end of term</div>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Min {formatXAF(p.min)}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Max {formatXAF(p.max)}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Mobile Money funding</li>
              </ul>

              <Button asChild className="mt-6 w-full bg-primary text-primary-foreground hover:opacity-90">
                <Link to="/auth">Activate plan</Link>
              </Button>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Capital + Profit paid at end of term. Investments carry risk.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-4xl text-primary md:text-5xl">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              { n: "01", t: "Open account", d: "Register in under a minute with your phone and email.", i: ShieldCheck },
              { n: "02", t: "Fund your wallet", d: "Pay via MTN or Orange Money, upload the screenshot.", i: Wallet },
              { n: "03", t: "Pick a plan", d: "Choose Starter, Growth or Premium and activate.", i: TrendingUp },
              { n: "04", t: "Receive payout", d: "Capital + profit hit your wallet at end of term.", i: Clock },
            ].map(({ n, t, d, i: Icon }) => (
              <div key={n} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl text-primary/30">{n}</span>
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-3 font-display text-xl text-primary">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h2 className="text-center font-display text-4xl text-primary md:text-5xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl">Ready to grow your money?</h2>
          <p className="mt-3 opacity-80">Open your free account in under a minute.</p>
          <Button asChild size="lg" className="mt-6 bg-white text-primary hover:bg-white/90">
            <Link to="/auth">Create account <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="font-medium text-primary">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}
