import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight, ShieldCheck, TrendingUp, Wallet, Clock,
  CheckCircle2, ChevronDown, Leaf, Lock, BadgeCheck, Users, LineChart, Headphones, Star,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SocialProof } from "@/components/SocialProof";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/Money";
import { useI18n } from "@/hooks/useI18n";


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
  { name: "Starter Plan", roi: 12, days: 14, min: 5000, max: 50000, badge: false },
  { name: "Growth Plan", roi: 30, days: 30, min: 25000, max: 300000, badge: true },
  { name: "Premium Plan", roi: 75, days: 60, min: 100000, max: 1000000, badge: false },
];

function Index() {
  const { t } = useI18n();
  const FAQ = [
    { q: t("landing.faq1.q"), a: t("landing.faq1.a") },
    { q: t("landing.faq2.q"), a: t("landing.faq2.a") },
    { q: t("landing.faq3.q"), a: t("landing.faq3.a") },
    { q: t("landing.faq4.q"), a: t("landing.faq4.a") },
    { q: t("landing.faq5.q"), a: t("landing.faq5.a") },
  ];

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
              <Leaf className="h-3.5 w-3.5" /> {t("landing.badge")}
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
              {t("landing.heroTitle1")} <span className="italic text-success">{t("landing.heroTitle2")}</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-85 md:text-xl">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth">
                  {t("landing.startInvesting")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <a href="#plans">{t("landing.viewPlans")}</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> 256-bit SSL encryption</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5" /> KYC-verified accounts</span>
              <span className="inline-flex items-center gap-1.5"><Headphones className="h-3.5 w-3.5" /> 24/7 human support</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:gap-6 md:grid-cols-4 md:py-10">
          {[
            { k: "12 400+", l: "Active investors" },
            { k: "1.2B XAF", l: "Payouts processed" },
            { k: "99.98%", l: "Platform uptime" },
            { k: "< 10 min", l: "Average withdrawal" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-xl font-bold uppercase tabular-nums text-primary sm:text-2xl md:text-3xl">{s.k}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-24">
        <div className="mb-8 text-center md:mb-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent sm:text-xs">Why SafeGrow</div>
          <h2 className="mt-3 font-display text-3xl leading-tight text-primary sm:text-4xl md:text-5xl">Built on trust, engineered for growth</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            A transparent investment platform designed for Central Africa — segregated funds, verified operators, and payouts you can audit line by line.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
          {[
            { i: ShieldCheck, t: "Segregated capital", d: "Investor funds are held separately from operating accounts and reconciled daily." },
            { i: LineChart, t: "Transparent returns", d: "Every profit payout is timestamped and appears in your wallet history in real time." },
            { i: Lock, t: "Bank-grade security", d: "End-to-end encryption, mandatory 2FA on withdrawals, and continuous fraud monitoring." },
            { i: Users, t: "Verified community", d: "Every account passes KYC before their first deposit — no anonymous participants." },
            { i: Wallet, t: "Local mobile money", d: "Fund and withdraw directly with MTN and Orange Mobile Money in XAF." },
            { i: Headphones, t: "Human support", d: "Chat, email, and phone support staffed by real analysts, not scripted bots." },
          ].map(({ i: Icon, t: title, d }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-elegant sm:p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-primary sm:text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>


      {/* PLANS */}
      <section id="plans" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{t("landing.plansEyebrow")}</div>
          <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">{t("landing.plansTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("landing.plansSubtitle")}</p>
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
                  {t("landing.popular")}
                </span>
              )}
              <div className="font-display text-2xl text-primary">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl text-success">{p.roi}%</span>
                <span className="text-sm text-muted-foreground">{t("landing.totalRoi")}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{p.days} {t("landing.daysPaidEnd")}</div>

              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{t("landing.min")} <Money value={p.min} /></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{t("landing.max")} <Money value={p.max} /></li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{t("landing.momoFunding")}</li>
              </ul>

              <Button asChild className="mt-6 w-full bg-primary text-primary-foreground hover:opacity-90">
                <Link to="/auth">{t("landing.activate")}</Link>
              </Button>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("landing.planCapital")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-4xl text-primary md:text-5xl">{t("landing.howTitle")}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {[
              { n: "01", t: t("landing.how1.t"), d: t("landing.how1.d"), i: ShieldCheck },
              { n: "02", t: t("landing.how2.t"), d: t("landing.how2.d"), i: Wallet },
              { n: "03", t: t("landing.how3.t"), d: t("landing.how3.d"), i: TrendingUp },
              { n: "04", t: t("landing.how4.t"), d: t("landing.how4.d"), i: Clock },
            ].map(({ n, t: title, d, i: Icon }) => (
              <div key={n} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl text-primary/30">{n}</span>
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-3 font-display text-xl text-primary">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-10 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Investor stories</div>
          <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">Real people, real payouts</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { n: "Achille N.", r: "Douala, CM", q: "Withdrawals hit my MTN account in under 8 minutes. The transparency is what keeps me here.", a: "Growth Plan · 8 months" },
            { n: "Marie-Claire T.", r: "Yaoundé, CM", q: "I started with the Starter Plan to test the waters. Every payout landed on schedule — I've since upgraded twice.", a: "Premium Plan · 1 year+" },
            { n: "Jean-Paul K.", r: "Libreville, GA", q: "Support actually answered my questions with real numbers, not scripts. That's rare in this space.", a: "Growth Plan · 5 months" },
          ].map((tst) => (
            <div key={tst.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">"{tst.q}"</p>
              <div className="mt-4 border-t border-border pt-3">
                <div className="font-display text-sm text-primary">{tst.n}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{tst.r} · {tst.a}</div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h2 className="text-center font-display text-4xl text-primary md:text-5xl">{t("landing.faqTitle")}</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl">{t("landing.ctaTitle")}</h2>
          <p className="mt-3 opacity-80">{t("landing.ctaSubtitle")}</p>
          <Button asChild size="lg" className="mt-6 bg-white text-primary hover:bg-white/90">
            <Link to="/auth">{t("landing.ctaButton")} <ArrowRight className="ml-1 h-4 w-4" /></Link>
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
