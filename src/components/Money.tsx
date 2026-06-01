import { formatXAF } from "@/lib/format";

/** Renders an XAF amount with the currency code bolded. */
export function Money({
  value,
  className = "",
  currencyClassName = "font-bold",
}: {
  value: number | string | null | undefined;
  className?: string;
  currencyClassName?: string;
}) {
  const full = formatXAF(value);
  // formatXAF -> "12 345 XAF"  →  split off trailing currency code
  const idx = full.lastIndexOf(" XAF");
  if (idx === -1) return <span className={className}>{full}</span>;
  const num = full.slice(0, idx);
  return (
    <span className={className}>
      {num} <span className={currencyClassName}>XAF</span>
    </span>
  );
}
