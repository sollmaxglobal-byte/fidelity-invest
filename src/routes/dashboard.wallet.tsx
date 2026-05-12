import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatXAF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/wallet")({
  component: WalletPage,
});

type Tx = {
  id: string;
  type: "deposit" | "withdrawal" | "investment" | "profit" | "investment_return" | string;
  amount: number;
  description: string | null;
  created_at: string;
};
type Pending = { id: string; amount: number; status: string; created_at: string };

const FILTERS = ["All", "Deposits", "Withdrawals", "Profits"] as const;
type Filter = typeof FILTERS[number];

function WalletPage() {
  const { user } = useAuth();
  const [tx, setTx] = useState<Tx[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Pending[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Pending[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: pd }, { data: pw }, { data: prof }] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("deposits").select("id,amount,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("withdrawals").select("id,amount,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle(),
      ]);
      setTx((t as Tx[]) ?? []);
      setPendingDeposits((pd as Pending[]) ?? []);
      setPendingWithdrawals((pw as Pending[]) ?? []);
      setBalance(Number(prof?.balance ?? 0));
    })();
  }, [user]);

  // Merge confirmed transactions + pending deposits/withdrawals into one feed
  const rows = useMemo(() => {
    type Row = { id: string; kind: "deposit" | "withdrawal" | "profit" | "investment"; amount: number; date: string; status: "approved" | "pending" | "rejected" | "paid" | "completed"; label: string };
    const out: Row[] = [];

    for (const t of tx) {
      let kind: Row["kind"] = "profit";
      let label = t.description ?? "";
      if (t.type === "deposit") { kind = "deposit"; label = label || "Deposit approved"; }
      else if (t.type === "withdrawal") { kind = "withdrawal"; label = label || "Withdrawal paid"; }
      else if (t.type === "investment") { kind = "investment"; label = label || "Investment"; }
      else if (t.type === "profit" || t.type === "investment_return") { kind = "profit"; label = label || "Profit"; }
      else continue;
      out.push({ id: t.id, kind, amount: Number(t.amount), date: t.created_at, status: "approved", label });
    }
    for (const d of pendingDeposits) {
      if (d.status === "pending") out.push({ id: `pd-${d.id}`, kind: "deposit", amount: Number(d.amount), date: d.created_at, status: "pending", label: "Deposit submitted" });
      else if (d.status === "rejected") out.push({ id: `pd-${d.id}`, kind: "deposit", amount: Number(d.amount), date: d.created_at, status: "rejected", label: "Deposit rejected" });
    }
    for (const w of pendingWithdrawals) {
      if (w.status === "pending") out.push({ id: `pw-${w.id}`, kind: "withdrawal", amount: -Number(w.amount), date: w.created_at, status: "pending", label: "Withdrawal requested" });
      else if (w.status === "rejected") out.push({ id: `pw-${w.id}`, kind: "withdrawal", amount: -Number(w.amount), date: w.created_at, status: "rejected", label: "Withdrawal rejected" });
    }

    out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    if (filter === "Deposits") return out.filter((r) => r.kind === "deposit");
    if (filter === "Withdrawals") return out.filter((r) => r.kind === "withdrawal");
    if (filter === "Profits") return out.filter((r) => r.kind === "profit");
    return out;
  }, [tx, pendingDeposits, pendingWithdrawals, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-primary md:text-3xl">Wallet</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">All your money movements in one place.</p>
      </div>

      <div className="rounded-2xl bg-hero p-5 text-primary-foreground shadow-elegant">
        <div className="text-xs uppercase tracking-wider opacity-80">Available balance</div>
        <div className="mt-1 font-display text-3xl">{formatXAF(balance)}</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to="/dashboard/deposit" className="flex items-center justify-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25">
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </Link>
          <Link to="/dashboard/withdraw" className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-primary hover:bg-white/90">
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  r.kind === "profit" ? "bg-success/15 text-success" :
                  r.kind === "deposit" ? "bg-primary/10 text-primary" :
                  r.kind === "withdrawal" ? "bg-warning/15 text-warning" :
                  "bg-accent/15 text-accent"
                }`}>
                  {r.kind === "profit" ? <Sparkles className="h-4 w-4" /> :
                   r.kind === "deposit" ? <ArrowDownToLine className="h-4 w-4" /> :
                   r.kind === "withdrawal" ? <ArrowUpFromLine className="h-4 w-4" /> :
                   <TrendingUp className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(r.date)}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-sm font-medium ${r.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {r.amount >= 0 ? "+" : ""}{formatXAF(r.amount)}
                </span>
                <StatusPill status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-success/15 text-success",
    paid: "bg-success/15 text-success",
    completed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    rejected: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium uppercase ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
