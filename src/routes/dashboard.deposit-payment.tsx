import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Smartphone, Building2, Bitcoin, Copy, Check, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";

const searchSchema = z.object({
  amount: z.coerce.number().min(1000),
  method: z.string().uuid(),
});

export const Route = createFileRoute("/dashboard/deposit-payment")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DepositPaymentPage,
});

type PaymentMethod = {
  id: string; type: "mobile_money" | "bank_transfer" | "crypto";
  label: string; account_name: string | null; account_number: string | null; instructions: string | null;
};

const ICONS = { mobile_money: Smartphone, bank_transfer: Building2, crypto: Bitcoin };

function DepositPaymentPage() {
  const { amount, method } = Route.useSearch();
  const [sel, setSel] = useState<PaymentMethod | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("payment_methods").select("*").eq("id", method).maybeSingle();
      setSel(data as PaymentMethod | null);
    })();
  }, [method]);

  if (!sel) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-sm text-muted-foreground">Loading payment details…</div>
    );
  }

  const Icon = ICONS[sel.type];

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-28 md:pb-6">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
          <ShieldCheck className="h-4 w-4" /> Secure payment · Step 2 of 3
        </div>
        <h1 className="font-display text-3xl text-primary">Complete your payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use the full payment details below and send the exact amount.</p>
      </div>

      {/* Amount */}
      <div className="rounded-lg bg-hero p-6 text-primary-foreground shadow-elegant">
        <div className="text-[10px] uppercase tracking-widest opacity-80">Amount to send</div>
        <div className="mt-1 font-display text-3xl font-bold uppercase tabular-nums">{formatXAF(amount)}</div>
      </div>

      {/* Payment method details */}
      <div className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Send to</div>
            <div className="font-semibold text-foreground">{sel.label}</div>
          </div>
        </div>
        <div className="space-y-2">
          <CopyRow label="Account name" value={sel.account_name ?? ""} />
          <CopyRow label="Account number" value={sel.account_number ?? ""} />
        </div>
        {sel.instructions && (
          <div className="rounded-md bg-secondary p-4 text-sm leading-relaxed">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Instructions</div>
            {sel.instructions}
          </div>
        )}

        <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition ${confirmed ? "border-success bg-success/10" : "border-border bg-background"}`}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm leading-relaxed text-foreground">I confirm that I paid <span className="font-bold uppercase">{formatXAF(amount)}</span> to the account shown above.</span>
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-xl gap-2">
          <Button asChild variant="outline" className="h-10 flex-1">
            <Link to="/dashboard/deposit"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          </Button>
          <Button asChild={confirmed} disabled={!confirmed} className="h-10 flex-[2] bg-primary text-primary-foreground">
            {confirmed ? (
              <Link to="/dashboard/deposit-proof" search={{ amount, method }}>Continue to proof <ArrowRight className="ml-1 h-4 w-4" /></Link>
            ) : <span>Tick payment confirmation</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2.5">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm font-medium">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
