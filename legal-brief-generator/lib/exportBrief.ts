import type { LegalBrief } from "./types";

/** Render the generated brief as a formatted Markdown document. */
export function briefToMarkdown(brief: LegalBrief): string {
  const lines: string[] = [];
  let footnote = 0;
  const footnotes: string[] = [];

  lines.push(`# ${brief.title}`);
  lines.push("");
  lines.push(`**Jurisdiction:** ${brief.jurisdiction}`);
  lines.push("");
  lines.push(`> ⚠️ ${brief.disclaimer}`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push(brief.executive_summary);
  lines.push("");

  lines.push("## Statement of Facts");
  lines.push("");
  lines.push(brief.statement_of_facts);
  lines.push("");

  lines.push("## Issues Presented");
  lines.push("");
  brief.issues_presented.forEach((issue, i) => lines.push(`${i + 1}. ${issue}`));
  lines.push("");

  lines.push("## Arguments");
  lines.push("");
  const roman = ["I", "II", "III", "IV", "V", "VI"];
  brief.arguments.forEach((arg, i) => {
    lines.push(`### ${roman[i] ?? i + 1}. ${arg.heading}`);
    lines.push("");
    lines.push(`_${arg.thesis}_`);
    lines.push("");
    arg.supporting_points.forEach((p, j) => lines.push(`${j + 1}. ${p}`));
    lines.push("");
    if (arg.case_references.length > 0) {
      const refs = arg.case_references
        .map((ref) => {
          footnote += 1;
          footnotes.push(
            `[^${footnote}]: *${ref.case_name}*, ${ref.citation} — ${ref.relevance}${ref.is_synthetic ? " **(⚠ synthetic reference — verify before use)**" : ""}`
          );
          return `[^${footnote}]`;
        })
        .join(" ");
      lines.push(`**Authorities:** ${refs}`);
      lines.push("");
    }
    lines.push(`**Anticipated counterargument:** ${arg.counterargument}`);
    lines.push("");
    lines.push(`**Rebuttal:** ${arg.rebuttal}`);
    lines.push("");
  });

  lines.push("## Counterarguments Summary");
  lines.push("");
  lines.push(brief.counterarguments_summary);
  lines.push("");

  lines.push("## Recommended Strategy");
  lines.push("");
  lines.push(brief.recommended_strategy);
  lines.push("");

  lines.push("## Risk Assessment");
  lines.push("");
  lines.push(
    `**Position strength:** ${brief.risk_assessment.strength} (confidence ${brief.risk_assessment.confidence}%)`
  );
  lines.push("");
  lines.push("Key vulnerabilities:");
  brief.risk_assessment.key_vulnerabilities.forEach((v) => lines.push(`- ${v}`));
  lines.push("");

  if (footnotes.length > 0) {
    lines.push("## References");
    lines.push("");
    footnotes.forEach((f) => lines.push(f));
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`_${brief.disclaimer}_`);
  lines.push("");

  return lines.join("\n");
}
