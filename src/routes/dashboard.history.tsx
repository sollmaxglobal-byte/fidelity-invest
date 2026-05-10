import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatXAF, formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
});

type Tx = { id: string; type: string; amount: number; description: string | null; created_at: string };

function HistoryPage() {
  const { user } = useAuth();
  const [tx, setTx] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setTx((data as Tx[]) ?? []));
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary md:text-4xl">Transaction history</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every credit and debit on your account.</p>
      </div>

      {tx.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-2 capitalize">{t.type}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.description ?? "—"}</td>
                  <td className={`px-4 py-2 text-right font-medium ${Number(t.amount) >= 0 ? "text-success" : "text-destructive"}`}>
                    {Number(t.amount) >= 0 ? "+" : ""}{formatXAF(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
