import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, ShieldOff, Plus, Minus, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatXAF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string; full_name: string | null; phone: string | null;
  balance: number; total_invested: number; total_earned: number; created_at: string;
  is_admin: boolean;
  is_suspended: boolean;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [adj, setAdj] = useState<{ id: string; amount: string }>({ id: "", amount: "" });

  async function load() {
    const { data: profs } = await supabase.from("profiles")
      .select("id,full_name,phone,balance,total_invested,total_earned,created_at,is_suspended")
      .order("created_at", { ascending: false }).limit(200);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role").eq("role", "admin");
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));
    setRows((profs ?? []).map((p) => ({ ...p, is_admin: adminSet.has(p.id) } as Row)));
  }
  useEffect(() => { load(); }, []);

  async function toggleAdmin(r: Row) {
    if (r.is_admin) {
      await supabase.from("user_roles").delete().eq("user_id", r.id).eq("role", "admin");
      toast.success("Admin removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: r.id, role: "admin" });
      toast.success("Admin granted");
    }
    load();
  }

  async function adjustBalance(r: Row, delta: number) {
    if (!delta) return;
    const newBalance = Number(r.balance) + delta;
    if (newBalance < 0) return toast.error("Resulting balance is negative");
    await supabase.from("profiles").update({ balance: newBalance }).eq("id", r.id);
    await supabase.from("transactions").insert({
      user_id: r.id, type: "adjustment", amount: delta,
      description: `Manual adjustment by admin`,
    });
    toast.success("Balance updated");
    setAdj({ id: "", amount: "" });
    load();
  }

  async function toggleSuspend(r: Row) {
    const next = !r.is_suspended;
    const { error } = await supabase.from("profiles").update({ is_suspended: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Account suspended" : "Account reactivated");
    load();
  }

  const filtered = rows.filter((r) =>
    !q || (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary md:text-4xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rows.length} accounts</p>
        </div>
        <Input className="max-w-xs" placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-primary">{r.full_name ?? "—"}</span>
                  {r.is_admin && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-foreground">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{r.phone ?? "—"} • Joined {formatDate(r.created_at)}</div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <div><div className="text-muted-foreground">Balance</div><div className="font-medium">{formatXAF(r.balance)}</div></div>
                  <div><div className="text-muted-foreground">Invested</div><div className="font-medium">{formatXAF(r.total_invested)}</div></div>
                  <div><div className="text-muted-foreground">Earned</div><div className="font-medium text-success">{formatXAF(r.total_earned)}</div></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleAdmin(r)}>
                  {r.is_admin ? <><ShieldOff className="mr-1 h-4 w-4" />Remove admin</> : <><Shield className="mr-1 h-4 w-4" />Make admin</>}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Adjust balance (XAF)</div>
                <Input
                  type="number"
                  className="mt-1 w-40"
                  value={adj.id === r.id ? adj.amount : ""}
                  onChange={(e) => setAdj({ id: r.id, amount: e.target.value })}
                  placeholder="e.g. 5000"
                />
              </div>
              <Button size="sm" className="bg-success text-white hover:opacity-90"
                onClick={() => adjustBalance(r, Number(adj.amount || 0))}>
                <Plus className="mr-1 h-4 w-4" /> Credit
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => adjustBalance(r, -Number(adj.amount || 0))}>
                <Minus className="mr-1 h-4 w-4" /> Debit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
