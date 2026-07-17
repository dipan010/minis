import type { ExtractionResult } from "./types";

/** Pre-filled extraction results for the three demo forms. All values are
 * synthetic — no real people, employers, or tax IDs. Confidence values are
 * varied deliberately so the demo shows all three badge colors and the
 * manual-review highlight. */
export const SAMPLE_RESULTS: Record<"W2" | "1099_NEC" | "FORM_16", ExtractionResult> = {
  W2: {
    formType: "W2",
    rawText: [
      "Form W-2 Wage and Tax Statement 2025",
      "c Employer's name, address, and ZIP code",
      "NORTHWIND ANALYTICS LLC",
      "482 Harbor Street, Suite 300, Portland, OR 97201",
      "b Employer identification number (EIN)  93-4821former765",
      "e Employee's first name and initial  Last name",
      "MAYA R  THOMPSON",
      "a Employee's social security number  XXX-XX-6214",
      "1 Wages, tips, other compensation  84,350.00",
      "2 Federal income tax withheld  9,712.45",
      "15 State  OR   16 State wages, tips, etc.  84,350.00",
      "17 State income tax  6,881.20",
    ].join("\n"),
    fields: [
      { fieldName: "employer_name", value: "Northwind Analytics LLC", confidence: 96 },
      { fieldName: "employer_ein", value: "93-4821765", confidence: 43 },
      { fieldName: "employee_name", value: "Maya R Thompson", confidence: 94 },
      { fieldName: "employee_ssn_last4", value: "6214", confidence: 91 },
      { fieldName: "wages_tips", value: "84,350.00", confidence: 97 },
      { fieldName: "federal_tax_withheld", value: "9,712.45", confidence: 95 },
      { fieldName: "state", value: "OR", confidence: 92 },
      { fieldName: "state_wages", value: "84,350.00", confidence: 88 },
      { fieldName: "state_tax", value: "6,881.20", confidence: 74 },
    ],
    warnings: [
      "1 extracted field(s) have confidence below 50 and need manual review.",
      "The EIN digits were partially obscured by an OCR artifact ('former' inserted mid-number) — verify against the source document.",
    ],
  },
  "1099_NEC": {
    formType: "1099_NEC",
    rawText: [
      "Form 1099-NEC Nonemployee Compensation 2025",
      "PAYER'S name, street address, city",
      "BRIGHTLOOP MEDIA INC",
      "77 Fulton Ave, Austin, TX 78701",
      "PAYER'S TIN  74-2210983",
      "RECIPIENT'S name  DEVON KRISHNAN",
      "RECIPIENT'S TIN  XXX-XX-3187",
      "1 Nonemployee compensation  23,400.00",
    ].join("\n"),
    fields: [
      { fieldName: "payer_name", value: "Brightloop Media Inc", confidence: 95 },
      { fieldName: "payer_tin", value: "74-2210983", confidence: 89 },
      { fieldName: "recipient_name", value: "Devon Krishnan", confidence: 93 },
      { fieldName: "recipient_tin", value: "XXX-XX-3187", confidence: 68 },
      { fieldName: "nonemployee_compensation", value: "23,400.00", confidence: 96 },
    ],
    warnings: [
      "Recipient TIN is masked on the form — only the last four digits are recoverable.",
    ],
  },
  FORM_16: {
    formType: "FORM_16",
    rawText: [
      "FORM NO. 16 [See rule 31(1)(a)]",
      "Certificate under section 203 of the Income-tax Act, 1961",
      "Name and address of the Employer: KAVERI SOFTWARE PRIVATE LIMITED",
      "12th Floor, Cyber Towers, Hitech City, Hyderabad 500081",
      "TAN of the Deductor: HYDK04217B",
      "Name of the Employee: ARJUN NAIR",
      "PAN of the Employee: BQJPN4732L",
      "1. Gross Salary  18,40,000",
      "2. Less: Allowances exempt under section 10  2,10,000",
      "Net taxable income  14,72,500",
      "Total tax payable  2,64,180",
    ].join("\n"),
    fields: [
      { fieldName: "employer_name", value: "Kaveri Software Private Limited", confidence: 95 },
      { fieldName: "employer_tan", value: "HYDK04217B", confidence: 87 },
      { fieldName: "employee_name", value: "Arjun Nair", confidence: 94 },
      { fieldName: "employee_pan", value: "BQJPN4732L", confidence: 90 },
      { fieldName: "gross_salary", value: "18,40,000", confidence: 93 },
      { fieldName: "exemptions_under_section_10", value: "2,10,000", confidence: 71 },
      { fieldName: "net_taxable_income", value: "14,72,500", confidence: 82 },
      { fieldName: "total_tax_payable", value: "2,64,180", confidence: 46 },
    ],
    warnings: [
      "1 extracted field(s) have confidence below 50 and need manual review.",
      "Amounts use Indian digit grouping (lakhs) — do not reformat as US thousands.",
    ],
  },
};

/** Placeholder "scanned form" preview images — simple text-on-white SVGs
 * encoded as data URIs, standing in for real form scans in the demo. */
function svgDataUri(title: string, lines: string[]): string {
  const rows = lines
    .map(
      (line, i) =>
        `<text x="24" y="${88 + i * 26}" font-family="monospace" font-size="13" fill="#334155">${line}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="${110 + lines.length * 26}" viewBox="0 0 440 ${110 + lines.length * 26}"><rect width="100%" height="100%" fill="#ffffff" stroke="#cbd5e1"/><rect x="0" y="0" width="440" height="52" fill="#f1f5f9"/><text x="24" y="34" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1e293b">${title}</text>${rows}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES: Record<"W2" | "1099_NEC" | "FORM_16", string> = {
  W2: svgDataUri("Form W-2 — Wage and Tax Statement (2025)", [
    "Employer: NORTHWIND ANALYTICS LLC",
    "EIN: 93-4821765",
    "Employee: MAYA R THOMPSON  SSN: XXX-XX-6214",
    "Box 1 Wages: 84,350.00   Box 2 Fed tax: 9,712.45",
    "State: OR  Wages: 84,350.00  Tax: 6,881.20",
  ]),
  "1099_NEC": svgDataUri("Form 1099-NEC — Nonemployee Compensation (2025)", [
    "Payer: BRIGHTLOOP MEDIA INC  TIN: 74-2210983",
    "Recipient: DEVON KRISHNAN  TIN: XXX-XX-3187",
    "Box 1 Nonemployee compensation: 23,400.00",
  ]),
  FORM_16: svgDataUri("Form 16 — Certificate of TDS on Salary", [
    "Employer: KAVERI SOFTWARE PVT LTD  TAN: HYDK04217B",
    "Employee: ARJUN NAIR  PAN: BQJPN4732L",
    "Gross Salary: 18,40,000  Exempt u/s 10: 2,10,000",
    "Net taxable income: 14,72,500",
    "Total tax payable: 2,64,180",
  ]),
};
