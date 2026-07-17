interface MedicationTableProps {
  medications: { name: string; dosage: string; frequency: string; duration: string }[];
}

/** Structured medication display: name / dosage / frequency / duration. */
export default function MedicationTable({ medications }: MedicationTableProps) {
  if (medications.length === 0) {
    return <p className="text-sm text-ink-soft">No medications prescribed in this encounter.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-line text-left">
            {["Medication", "Dosage", "Frequency", "Duration"].map((h) => (
              <th key={h} className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.map((m, i) => (
            <tr key={i} className="border-b border-line/60 last:border-b-0">
              <td className="py-2 pr-3 text-sm font-medium">{m.name}</td>
              <td className="py-2 pr-3 text-sm text-ink-soft">{m.dosage}</td>
              <td className="py-2 pr-3 text-sm text-ink-soft">{m.frequency}</td>
              <td className="py-2 text-sm text-ink-soft">{m.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
