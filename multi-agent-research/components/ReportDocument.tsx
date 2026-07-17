import type { ResearchReport, ReviewResult } from "@/lib/types";

function reviewColor(score: number): string {
  if (score >= 85) return "#15803D";
  if (score >= 70) return "#B45309";
  return "#B91C1C";
}

interface ReportDocumentProps {
  report: ResearchReport;
  review: ReviewResult;
}

/** Renders the final report as a formal paper: serif headings, justified
 * text, numbered sections, limitations, and simulated references. */
export default function ReportDocument({ report, review }: ReportDocumentProps) {
  return (
    <article className="panel p-6 sm:p-10 relative">
      {/* Reviewer score badge */}
      <div
        className="absolute top-5 right-5 flex flex-col items-center rounded-lg border px-3 py-2"
        style={{ borderColor: reviewColor(review.score), color: reviewColor(review.score) }}
        title={review.feedback.join("\n")}
      >
        <span className="font-mono text-xl font-bold tabular-nums">{review.score}</span>
        <span className="font-mono text-[9px] uppercase tracking-wider">review score</span>
      </div>

      <header className="border-b-2 border-ink pb-6 mb-8 pr-24">
        <h2 id="report-title" className="font-serif text-2xl sm:text-3xl font-bold leading-tight scroll-mt-24">
          {report.title}
        </h2>
        <p className="font-mono text-[11px] text-ink-soft mt-3">
          {report.metadata.depth} depth · {report.metadata.agents_used} agent passes ·{" "}
          {report.metadata.total_steps} steps ·{" "}
          {(report.metadata.generation_time_ms / 1000).toFixed(0)}s
        </p>
      </header>

      <section id="abstract" className="mb-8 scroll-mt-24">
        <h3 className="font-serif text-lg font-semibold mb-2">Abstract</h3>
        <p className="report-doc text-[15px] italic text-ink-soft">{report.abstract}</p>
      </section>

      {report.sections.map((section, i) => (
        <section key={i} id={`section-${i}`} className="mb-8 scroll-mt-24">
          <h3 className="font-serif text-lg font-semibold mb-2">
            {i + 1}. {section.heading}
          </h3>
          <p className="report-doc text-[15px] whitespace-pre-line">{section.content}</p>
          {section.findings.length > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft mt-2">
              Draws on: {section.findings.join(", ")}
            </p>
          )}
        </section>
      ))}

      <section id="conclusion" className="mb-8 scroll-mt-24">
        <h3 className="font-serif text-lg font-semibold mb-2">Conclusion</h3>
        <p className="report-doc text-[15px]">{report.conclusion}</p>
      </section>

      <section id="limitations" className="mb-8 scroll-mt-24">
        <h3 className="font-serif text-lg font-semibold mb-2">Limitations</h3>
        <ul className="report-doc text-[15px] list-disc ml-6 space-y-1">
          {report.limitations.map((limitation, i) => (
            <li key={i}>{limitation}</li>
          ))}
        </ul>
      </section>

      <section id="references" className="scroll-mt-24">
        <h3 className="font-serif text-lg font-semibold mb-2">References</h3>
        <ol className="space-y-1.5">
          {report.simulated_references.map((ref) => (
            <li key={ref.id} className="flex gap-2 text-[13px] leading-snug">
              <span className="font-mono text-xs text-ink-soft shrink-0 pt-0.5">
                [{ref.id}]
              </span>
              <span>
                {ref.text}{" "}
                <span className="inline-block rounded bg-amber-50 border border-amber-300 px-1.5 py-0.5 text-[11px] text-amber-700 whitespace-nowrap">
                  ⚠ Simulated reference
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
