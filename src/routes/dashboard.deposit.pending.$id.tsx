import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Clock, CheckCircle2, XCircle, History, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/dashboard/deposit/pending/$id")({
  component: PendingDepositPage,
});

const WAIT_MS = 5 * 60 * 1000;
const POLL_MS = 8 * 1000;

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
};

function PendingDepositPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Poll status
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      const { data } = await supabase
        .from("deposits")
        .select("id,user_id,amount,status,created_at")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as Deposit | null;
      if (d) {
        setDeposit(d);
        startRef.current = Math.min(startRef.current, new Date(d.created_at).getTime());
        if (d.status === "approved" || d.status === "rejected") return; // stop polling
      }
      timer = setTimeout(fetchOnce, POLL_MS);
    };
    fetchOnce();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [id, user]);

  // Elapsed timer
  useEffect(() => {
    const tick = () => setElapsed(Date.now() - startRef.current);
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Timeout → wallet history
  useEffect(() => {
    if (!deposit) return;
    if (deposit.status !== "pending") return;
    if (elapsed >= WAIT_MS) {
      navigate({ to: "/dashboard/wallet", search: { filter: "Deposits" } as never });
    }
  }, [elapsed, deposit, navigate]);

  if (loading || !deposit) {
    return <div className="grid min-h-[50vh] place-items-center text-muted-foreground">Loading…</div>;
  }

  const remaining = Math.max(0, WAIT_MS - elapsed);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const pct = Math.min(100, (elapsed / WAIT_MS) * 100);

  if (deposit.status === "approved") {
    return (
      <div className="mx-auto max-w-md space-y-4 py-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <h1 className="font-display text-2xl text-primary">Payment successful</h1>
        <p className="text-sm text-muted-foreground">
          Your deposit has been confirmed and added to your wallet balance.
        </p>
        <div className="rounded-2xl border border-border bg-card p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Amount credited</span>
            <span className="font-display text-xl text-success">{formatXAF(deposit.amount)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild className="bg-primary text-primary-foreground hover:opacity-90">
            <Link to="/dashboard"><Home className="mr-2 h-4 w-4" />Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/invest">Invest now</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (deposit.status === "rejected") {
    return (
      <div className="mx-auto max-w-md space-y-4 py-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="font-display text-2xl text-primary">Deposit rejected</h1>
        <p className="text-sm text-muted-foreground">
          We couldn't verify this payment. Contact support if you believe this is a mistake.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <Link to="/dashboard/wallet" search={{ filter: "Deposits" } as never}>
              <History className="mr-2 h-4 w-4" />History
            </Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:opacity-90">
            <Link to="/dashboard/deposit">Try again</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/15">
          <Clock className="h-12 w-12 animate-pulse text-warning" />
        </div>
        <h1 className="mt-3 font-display text-2xl text-primary">Awaiting payment confirmation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We're verifying your transfer. This usually takes a few minutes.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Amount</span>
          <span className="font-display text-xl text-primary">{formatXAF(deposit.amount)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">Pending</span>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Time remaining</span>
            <span className="font-mono text-foreground">{mm}:{ss}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            If your payment isn't confirmed within 5 minutes, you'll be taken to your deposit history.
            Don't worry — pending deposits stay safe and will be credited as soon as our team approves them.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to="/dashboard/wallet" search={{ filter: "Deposits" } as never}>
            <History className="mr-2 h-4 w-4" />History
          </Link>
        </Button>
        <Button asChild className="bg-primary text-primary-foreground hover:opacity-90">
          <Link to="/dashboard"><Home className="mr-2 h-4 w-4" />Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
