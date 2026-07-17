export type TaxFormType = "W2" | "1099_NEC" | "1099_INT" | "FORM_16";

export const FORM_TYPE_LABELS: Record<TaxFormType, string> = {
  W2: "W-2 — Wage and Tax Statement (US)",
  "1099_NEC": "1099-NEC — Nonemployee Compensation (US)",
  "1099_INT": "1099-INT — Interest Income (US)",
  FORM_16: "Form 16 — Certificate of TDS on Salary (India)",
};

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number; // 0-100
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface ExtractionResult {
  formType: TaxFormType;
  fields: ExtractedField[];
  rawText: string;
  warnings: string[];
}

/** Static definition of one expected field on a form type — used to build
 * the extraction JSON schema, group fields into UI sections, and label
 * the editable form. */
export interface FieldSpec {
  key: string;
  label: string;
  category: "Employer / Payer Info" | "Employee / Recipient Info" | "Income" | "Taxes";
}

export const FORM_SCHEMAS: Record<TaxFormType, FieldSpec[]> = {
  W2: [
    { key: "employer_name", label: "Employer name", category: "Employer / Payer Info" },
    { key: "employer_ein", label: "Employer EIN", category: "Employer / Payer Info" },
    { key: "employee_name", label: "Employee name", category: "Employee / Recipient Info" },
    { key: "employee_ssn_last4", label: "Employee SSN (last 4)", category: "Employee / Recipient Info" },
    { key: "wages_tips", label: "Wages, tips, other compensation", category: "Income" },
    { key: "federal_tax_withheld", label: "Federal income tax withheld", category: "Taxes" },
    { key: "state", label: "State", category: "Taxes" },
    { key: "state_wages", label: "State wages", category: "Income" },
    { key: "state_tax", label: "State income tax", category: "Taxes" },
  ],
  "1099_NEC": [
    { key: "payer_name", label: "Payer name", category: "Employer / Payer Info" },
    { key: "payer_tin", label: "Payer TIN", category: "Employer / Payer Info" },
    { key: "recipient_name", label: "Recipient name", category: "Employee / Recipient Info" },
    { key: "recipient_tin", label: "Recipient TIN", category: "Employee / Recipient Info" },
    { key: "nonemployee_compensation", label: "Nonemployee compensation (Box 1)", category: "Income" },
  ],
  "1099_INT": [
    { key: "payer_name", label: "Payer name", category: "Employer / Payer Info" },
    { key: "interest_income", label: "Interest income (Box 1)", category: "Income" },
    { key: "early_withdrawal_penalty", label: "Early withdrawal penalty (Box 2)", category: "Taxes" },
    { key: "tax_exempt_interest", label: "Tax-exempt interest (Box 8)", category: "Income" },
  ],
  FORM_16: [
    { key: "employer_name", label: "Employer name", category: "Employer / Payer Info" },
    { key: "employer_tan", label: "Employer TAN", category: "Employer / Payer Info" },
    { key: "employee_name", label: "Employee name", category: "Employee / Recipient Info" },
    { key: "employee_pan", label: "Employee PAN", category: "Employee / Recipient Info" },
    { key: "gross_salary", label: "Gross salary (₹)", category: "Income" },
    { key: "exemptions_under_section_10", label: "Exemptions under Section 10 (₹)", category: "Income" },
    { key: "net_taxable_income", label: "Net taxable income (₹)", category: "Income" },
    { key: "total_tax_payable", label: "Total tax payable (₹)", category: "Taxes" },
  ],
};

export const FIELD_CATEGORIES: FieldSpec["category"][] = [
  "Employer / Payer Info",
  "Employee / Recipient Info",
  "Income",
  "Taxes",
];
