import { formatMoney } from "@dnd/shared";

export default function Money({
  value,
  currency = "ARS",
  className = "",
}: {
  value: bigint | string | number;
  currency?: string;
  className?: string;
}) {
  return <span className={`font-data-mono ${className}`}>{formatMoney(value, currency)}</span>;
}
