import type { InventoryRecommendation } from "@/lib/types";

const RISK_COLOR = { low: "#15803D", medium: "#B45309", high: "#B91C1C" } as const;

interface InventoryCardProps {
  inventory: InventoryRecommendation;
  leadTime: number;
}

/** Inventory recommendation dashboard card. */
export default function InventoryCard({ inventory, leadTime }: InventoryCardProps) {
  const items: { label: string; value: string; hint: string }[] = [
    {
      label: "Reorder point",
      value: inventory.reorder_point.toLocaleString(),
      hint: `Order when stock falls to this level (${leadTime}-day lead time)`,
    },
    {
      label: "Safety stock",
      value: inventory.safety_stock.toLocaleString(),
      hint: "Buffer for demand variability at ~95% service level",
    },
    {
      label: "Suggested order qty",
      value: inventory.suggested_order_quantity.toLocaleString(),
      hint: "Covers ~2 lead times (min 2 weeks) of forecast demand",
    },
  ];

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
          Inventory recommendations
        </p>
        <span
          className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
          style={{ background: RISK_COLOR[inventory.stockout_risk] }}
        >
          {inventory.stockout_risk} stockout risk
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-surface border border-line p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">{item.label}</p>
            <p className="font-mono text-2xl font-bold text-primary tabular-nums my-1">{item.value}</p>
            <p className="text-[11px] text-ink-soft leading-snug">{item.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
