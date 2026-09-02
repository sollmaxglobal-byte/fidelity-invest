export function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const cls =
    s === "approved" || s === "paid" || s === "completed"
      ? "bg-success/15 text-success"
      : s === "rejected" || s === "failed"
        ? "bg-destructive/15 text-destructive"
        : "bg-primary/15 text-primary";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
