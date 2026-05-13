import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Smartphone, Building2, Bitcoin, Upload, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendEmail } from "@/lib/email-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXAF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/deposit")({
  component: DepositPage,
});

type PaymentMethod = {
  id: string; type: "mobile_money" | "bank_transfer" | "crypto";
  label: string; account_name: string | null; account_number: string | null; instructions: string | null;
};

type Deposit = {
  id: string; amount: number; status: string; reference: string | null; created_at: string;
  payment_methods: { label: string } | null;
};

const ICONS = { mobile_money: Smartphone, bank_transfer: Building2, crypto: Bitcoin };

const schema = z.object({
  amount: z.number().min(1000, "Minimum 1,000 XAF").max(100_000_000),
  payment_method_id: z.string().uuid(),
});

function DepositPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: m }, { data: d }] = await Promise.all([
        supabase.from("payment_methods").select("*").eq("active", true).order("type"),
        supabase.from("deposits").select("*, payment_methods(label)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const ms = (m as PaymentMethod[]) ?? [];
      setMethods(ms);
      if (ms[0]) setSelected(ms[0].id);
      setDeposits((d as Deposit[]) ?? []);
    })();
  }, [user]);

  const sel = methods.find((m) => m.id === selected);

  async function refresh() {
    if (!user) return;
    const { data: d } = await supabase.from("deposits").select("*, payment_methods(label)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setDeposits((d as Deposit[]) ?? []);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    if (!file) { toast.error("Please upload your payment screenshot"); return; }
    setBusy(true);
    try {
      const v = schema.parse({
        amount: Number(amount),
        payment_method_id: selected,
      });
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;
      const proof_url = path;
      const method = methods.find((m) => m.id === v.payment_method_id);
      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: v.amount,
        payment_method_id: v.payment_method_id,
        proof_url,
        status: "pending",
      });
      if (error) throw error;
      // Notify user
      if (user.email) {
        sendEmail({
          to: user.email,
          template_key: "deposit_submitted",
          variables: {
            name: user.user_metadata?.full_name ?? "Investor",
            amount: v.amount.toLocaleString("fr-CM"),
            method: method?.label ?? "—",
          },
        });
      }
      toast.success("Deposit submitted — pending review");
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setAmount("");
      refresh();
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary md:text-4xl">Deposit funds</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a method, send the funds, then submit proof.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Method selection + instructions */}
        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {methods.map((m) => {
              const Icon = ICONS[m.type];
              const active = m.id === selected;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  type="button"
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active ? "border-gold bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${active ? "text-gold" : "text-primary"}`} />
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>

          {sel && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Send payment to</div>
              <div className="mt-2 space-y-2">
                <CopyRow label="Account name" value={sel.account_name ?? ""} />
                <CopyRow label="Account / Number" value={sel.account_number ?? ""} />
                <CopyRow
                  label="Amount to send (XAF)"
                  value={amount && Number(amount) > 0 ? Number(amount).toLocaleString("fr-CM") : "Enter an amount →"}
                />
              </div>
              <div className="mt-4 rounded-lg bg-secondary p-3 text-sm leading-relaxed">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Instructions</div>
                {sel.instructions}
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div>
            <Label htmlFor="amount">Amount (XAF)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={1000}
              step={500}
              required
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="proof">Payment screenshot <span className="text-destructive">*</span></Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground hover:border-primary">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">{file?.name ?? "Tap to upload your proof of payment"}</span>
              <input id="proof" type="file" accept="image/*" required className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">A clear screenshot of the transfer is the only thing required — no transaction reference needed.</p>
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:opacity-90">
            {busy ? "Submitting…" : "Submit deposit"}
          </Button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-primary">Recent deposits</h2>
        {deposits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No deposits yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Method</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-2">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-2">{d.payment_methods?.label ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatXAF(d.amount)}</td>
                    <td className="px-4 py-2 text-right">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    paid: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
