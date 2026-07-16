import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Smartphone, Building2, Bitcoin, Upload, Copy, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { sendEmail } from "@/lib/email-client";
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
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { amount, method } = Route.useSearch();
  const [sel, setSel] = useState<PaymentMethod | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("payment_methods").select("*").eq("id", method).maybeSingle();
      setSel(data as PaymentMethod | null);
    })();
  }, [method]);

  async function compressImage(f: File): Promise<File> {
    if (!f.type.startsWith("image/") || f.size < 700_000) return f;
    try {
      const bmp = await createImageBitmap(f);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale);
      const h = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return f;
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.82));
      if (!blob) return f;
      return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
    } catch { return f; }
  }

  async function onSubmit() {
    if (!user || !sel) return;
    if (!file) { toast.error(t("deposit.errNoFile")); return; }
    setBusy(true);
    const retry = async <T,>(fn: () => Promise<T>, attempts = 3): Promise<T> => {
      let lastErr: unknown;
      for (let i = 0; i < attempts; i++) {
        try { return await fn(); }
        catch (e) {
          lastErr = e;
          const msg = (e as Error)?.message ?? "";
          if (!/fetch|network|load failed|timeout/i.test(msg)) throw e;
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
      }
      throw lastErr;
    };
    try {
      const upload = await compressImage(file);
      const safeName = upload.name.replace(/[^\w.-]+/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      await retry(async () => {
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, upload, { upsert: false, cacheControl: "3600" });
        if (upErr) throw upErr;
      });
      let depositId = "";
      await retry(async () => {
        const { data: inserted, error } = await supabase.from("deposits").insert({
          user_id: user.id,
          amount,
          payment_method_id: method,
          proof_url: path,
          status: "pending",
        }).select("id").single();
        if (error) throw error;
        depositId = inserted!.id as string;
      });
      if (user.email) {
        sendEmail({
          to: user.email,
          template_key: "deposit_submitted",
          variables: {
            name: user.user_metadata?.full_name ?? "Investor",
            amount: String(amount),
            method: sel.label,
            transaction_id: depositId,
          },
        });
      }
      toast.success(t("deposit.submitted"));
      navigate({ to: "/deposit-pending/$id", params: { id: depositId } });
    } catch (err) {
      const raw = (err as Error).message ?? "Error";
      const friendly = /failed to fetch|network|load failed|timeout/i.test(raw)
        ? "Upload failed. Please check your internet connection and try again."
        : raw;
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  }

  if (!sel) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center text-sm text-muted-foreground">Loading payment details…</div>
    );
  }

  const Icon = ICONS[sel.type];

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-28 md:pb-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary md:text-3xl">Complete your payment</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Send the exact amount, then upload your proof of payment.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/dashboard/deposit"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back</Link>
        </Button>
      </div>

      {/* Amount */}
      <div className="rounded-2xl bg-hero p-5 text-primary-foreground shadow-elegant">
        <div className="text-[10px] uppercase tracking-widest opacity-80">Amount to send</div>
        <div className="mt-1 font-display text-3xl font-bold uppercase tabular-nums">{formatXAF(amount)}</div>
      </div>

      {/* Payment method details */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
          <div className="rounded-xl bg-secondary p-3 text-sm leading-relaxed">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Instructions</div>
            {sel.instructions}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-foreground">I have completed the transfer of <span className="font-semibold">{formatXAF(amount)}</span></span>
        </label>
      </div>

      {/* Proof upload */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="font-display text-lg text-primary">Upload proof of payment</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">A screenshot or receipt image works best.</p>
        </div>
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-background p-8 text-center transition ${
          confirmed ? "border-border hover:border-primary" : "pointer-events-none border-border opacity-50"
        }`}>
          {file ? (
            <>
              <Check className="h-10 w-10 text-success" />
              <div className="text-sm font-medium text-foreground">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-medium text-foreground">
                {confirmed ? "Tap to upload proof" : "Confirm your payment above first"}
              </div>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {/* Submit */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto max-w-xl">
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={busy || !file || !confirmed}
            className="h-10 w-full bg-primary text-sm text-primary-foreground hover:opacity-90"
          >
            {busy ? "Submitting…" : "Submit deposit request"}
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
