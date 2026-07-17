import type { FraudResult, Transaction } from "@/lib/types";
import RiskBadge, { riskColor } from "./RiskBadge";

interface DetailPanelProps {
  transaction: Transaction;
  result: FraudResult;
}

const ACTION_STYLES = {
  approve: { label: "Approve", color: "var(--ok)" },
  review: { label: "Review", color: "var(--warn)" },
  block: { label: "Block", color: "var(--bad)" },
} as const;

/** Full detail view for the selected transaction: fields, signals with
 * scores, LLM explanation (if flagged), and action buttons (UI only). */
export default function DetailPanel({ transaction: tx, result }: DetailPanelProps) {
  const fields: [string, string][] = [
    ["Transaction", tx.id],
    ["Timestamp", new Date(tx.timestamp).toLocaleString()],
    ["Amount", `${tx.amount.toFixed(2)} ${tx.currency}`],
    ["Merchant", tx.merchant],
    ["Category", tx.category],
    ["Channel", tx.channel],
    ["Customer", tx.customer_id],
    ["Card", `•••• ${tx.card_last4}`],
    ["Location", `${tx.location.city}, ${tx.location.country}`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink">{tx.id}</span>
          <RiskBadge score={result.risk_score} />
        </div>
        <span
          className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded"
          style={{
            color: ACTION_STYLES[result.recommended_action].color,
            border: `1px solid ${ACTION_STYLES[result.recommended_action].color}`,
          }}
        >
          {ACTION_STYLES[result.recommended_action].label} recommended
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-soft pt-0.5">
              {label}
            </dt>
            <dd className="font-mono text-xs text-ink truncate">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mb-1.5">
          Fraud signals ({result.signals.length})
        </p>
        {result.signals.length === 0 ? (
          <p className="text-xs text-ok">No signals — transaction within baseline.</p>
        ) : (
          <ul className="space-y-1.5">
            {result.signals.map((signal, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug">
                <span
                  className="font-mono font-bold shrink-0 w-16"
                  style={{ color: riskColor(50 + signal.score) }}
                >
                  {signal.type} +{signal.score}
                </span>
                <span className="text-ink-soft">{signal.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.is_flagged && result.explanation && (
        <div
          className="rounded-md p-3 text-xs leading-relaxed text-ink"
          style={{ background: "color-mix(in srgb, var(--warn) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 35%, transparent)" }}
        >
          <p className="font-mono text-[10px] uppercase tracking-wide text-warn mb-1">
            Analyst explanation (LLM)
          </p>
          {result.explanation}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {(Object.keys(ACTION_STYLES) as (keyof typeof ACTION_STYLES)[]).map((action) => (
          <button
            key={action}
            type="button"
            className="flex-1 rounded-md py-1.5 font-mono text-[11px] uppercase tracking-wide transition-opacity hover:opacity-80"
            style={{
              color: ACTION_STYLES[action].color,
              border: `1px solid ${ACTION_STYLES[action].color}`,
              background:
                result.recommended_action === action
                  ? `color-mix(in srgb, ${ACTION_STYLES[action].color} 14%, transparent)`
                  : "transparent",
            }}
          >
            {ACTION_STYLES[action].label}
          </button>
        ))}
      </div>
    </div>
  );
}
