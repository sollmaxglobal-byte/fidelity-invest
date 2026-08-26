import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { formatXAF } from "@/lib/format";

type StatusRow = { id: string; user_id: string; amount: number; status: string };

export function TransactionNotifications() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (!user) return;

    const notify = (kind: "deposit" | "withdrawal", row: StatusRow) => {
      const fr = langRef.current === "fr";
      const type = kind === "deposit" ? (fr ? "Dépôt" : "Deposit") : fr ? "Retrait" : "Withdrawal";
      const status =
        row.status === "approved" || row.status === "paid"
          ? fr
            ? "approuvé"
            : "approved"
          : row.status === "rejected"
            ? fr
              ? "refusé"
              : "rejected"
            : row.status;
      const message = `${type} ${status} · ${formatXAF(row.amount)}`;
      toast(row.status === "rejected" ? `⚠️ ${message}` : `✅ ${message}`);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Fidelity", {
          body: message,
          icon: "/fidelity-app-icon-192.png",
          tag: `${kind}-${row.id}-${row.status}`,
        });
      }
    };

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    const channel = supabase
      .channel(`transaction-alerts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` },
        (payload) => notify("deposit", payload.new as StatusRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawals",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => notify("withdrawal", payload.new as StatusRow),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
