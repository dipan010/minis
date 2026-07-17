interface ICD10TableProps {
  suggestions: { code: string; description: string; confidence: number }[];
}

function confidenceColor(confidence: number): string {
  if (confidence >= 75) return "#16A34A";
  if (confidence >= 50) return "#D97706";
  return "#B91C1C";
}

/** Small ICD-10 code table with confidence bars. */
export default function ICD10Table({ suggestions }: ICD10TableProps) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-ink-soft">No ICD-10 codes suggested.</p>;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft">Code</th>
          <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft">Description</th>
          <th className="py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft w-36">Confidence</th>
        </tr>
      </thead>
      <tbody>
        {suggestions.map((s) => (
          <tr key={s.code} className="border-b border-line/60 last:border-b-0">
            <td className="py-2 pr-3 font-mono text-sm font-semibold whitespace-nowrap">{s.code}</td>
            <td className="py-2 pr-3 text-sm text-ink-soft">{s.description}</td>
            <td className="py-2">
              <div className="flex items-center gap-2">
                <div className="relative h-1.5 flex-1 rounded-full bg-line overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, s.confidence))}%`,
                      background: confidenceColor(s.confidence),
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-ink-soft w-8 text-right">
                  {s.confidence}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
