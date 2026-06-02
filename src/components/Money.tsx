import { formatXAF } from "@/lib/format";

/** Renders an XAF amount in bold uppercase (symbol + value together). */
export function Money({
  value,
  className = "",
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  return (
    <span className={`font-bold uppercase ${className}`}>{formatXAF(value)}</span>
  );
}
