import type { FraudResult, Transaction } from "@/lib/types";
import RiskBadge from "./RiskBadge";

interface TransactionRowProps {
  transaction: Transaction;
  result: FraudResult;
  selected: boolean;
  onSelect: () => void;
}

/** Compact terminal-style row in the live feed. Flagged rows get a colored
 * left border. */
export default function TransactionRow({
  transaction: tx,
  result,
  selected,
  onSelect,
}: TransactionRowProps) {
  const border =
    result.recommended_action === "block"
      ? "var(--bad)"
      : result.is_flagged
        ? "var(--warn)"
        : "transparent";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-1.5 font-mono text-[11px] flex items-center gap-3 border-b border-line/50 transition-colors ${
        selected ? "bg-card-hover" : "hover:bg-card-hover/60"
      }`}
      style={{ borderLeft: `3px solid ${border}` }}
    >
      <span className="text-ink-soft shrink-0">
        {new Date(tx.timestamp).toLocaleTimeString(undefined, { hour12: false })}
      </span>
      <span className="text-ink tabular-nums w-24 shrink-0 text-right">
        {tx.amount.toFixed(2)} {tx.currency}
      </span>
      <span className="text-ink-soft truncate flex-1">{tx.merchant}</span>
      <span className="text-ink-soft hidden sm:block truncate w-28">{tx.location.city}</span>
      <RiskBadge score={result.risk_score} />
    </button>
  );
}
