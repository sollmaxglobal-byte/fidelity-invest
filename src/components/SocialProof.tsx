import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { formatXAF } from "@/lib/format";

const NAMES = [
  "Achille N.", "Marie-Claire T.", "Jean-Paul K.", "Estelle M.", "Boris E.",
  "Chantal O.", "Serge B.", "Nadine F.", "Patrick L.", "Sylvie A.",
  "Emmanuel D.", "Grace W.", "Yannick S.", "Aline P.", "Guy R.",
  "Rachelle H.", "Christian I.", "Larissa V.", "Franck U.", "Aïcha Z.",
];

const CITIES = ["Douala", "Yaoundé", "Bafoussam", "Kribi", "Garoua", "Bamenda", "Libreville", "Limbe"];

type Notice = {
  id: number;
  kind: "deposit" | "withdraw";
  name: string;
  city: string;
  amount: number;
  minsAgo: number;
};

function makeNotice(id: number): Notice {
  const kind: "deposit" | "withdraw" = Math.random() < 0.55 ? "deposit" : "withdraw";
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const buckets = [5000, 10000, 15000, 25000, 40000, 60000, 85000, 120000, 175000, 240000, 300000];
  const amount = buckets[Math.floor(Math.random() * buckets.length)];
  const minsAgo = 1 + Math.floor(Math.random() * 12);
  return { id, kind, name, city, amount, minsAgo };
}

export function SocialProof() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let counter = 0;
    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const cycle = () => {
      counter += 1;
      setNotice(makeNotice(counter));
      hideTimer = setTimeout(() => setNotice(null), 5000);
      nextTimer = setTimeout(cycle, 12000);
    };

    const initial = setTimeout(cycle, 3500);
    return () => {
      clearTimeout(initial);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, []);

  if (!notice) return null;

  const isDeposit = notice.kind === "deposit";
  const Icon = isDeposit ? ArrowDownCircle : ArrowUpCircle;

  return (
    <div
      key={notice.id}
      className="fixed bottom-4 left-3 right-3 z-50 animate-fade-in sm:left-4 sm:right-auto sm:max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-elegant backdrop-blur">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            isDeposit ? "bg-success/15 text-success" : "bg-accent/15 text-accent"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{notice.name}</span>
            <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              · {notice.city}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {isDeposit ? "just deposited" : "just withdrew"}{" "}
            <span className="font-bold uppercase tabular-nums text-foreground">
              {formatXAF(notice.amount)}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {notice.minsAgo} min ago
          </div>
        </div>
        <button
          onClick={() => setNotice(null)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
