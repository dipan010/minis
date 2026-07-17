import type { DocumentInput } from "./types";

/** Two sample policy/regulation pairs. Both "regulations" are simplified
 * synthetic summaries written for this demo — NOT actual legal text. The
 * policies contain deliberate gaps so the analysis has something to find. */

export interface SamplePair {
  name: string;
  policy: DocumentInput;
  regulation: DocumentInput;
}

const GDPR_REGULATION = `SIMPLIFIED DATA PROTECTION REQUIREMENTS (modeled loosely on GDPR Articles 5-9 — synthetic summary, not legal text)

Section 1 — Principles of processing
1.1 Personal data shall be processed lawfully, fairly and transparently. The organization must be able to state a lawful basis for every processing activity.
1.2 Personal data shall be collected for specified, explicit and legitimate purposes and not further processed in a manner incompatible with those purposes.
1.3 Personal data shall be adequate, relevant and limited to what is necessary for the stated purposes (data minimisation).
1.4 Personal data shall be accurate and, where necessary, kept up to date. Inaccurate data must be erased or rectified without delay.
1.5 Personal data shall be kept in an identifiable form no longer than necessary for the purposes. The organization must define and enforce retention periods for each category of personal data, and must delete or anonymise data when the retention period expires.
1.6 Personal data shall be processed with appropriate security, including protection against unauthorised access, accidental loss, destruction or damage, using appropriate technical and organisational measures such as encryption at rest and in transit.

Section 2 — Accountability and records
2.1 The organization must maintain a written record of processing activities, including purposes, data categories, recipients, and retention periods.
2.2 The organization must be able to demonstrate compliance with the principles above on request by a supervisory authority.

Section 3 — Consent
3.1 Where processing is based on consent, the organization must be able to demonstrate that consent was given.
3.2 Consent requests must be clearly distinguishable, in plain language, and consent must be as easy to withdraw as to give.

Section 4 — Data subject rights
4.1 The organization must inform individuals, at the time of collection, of the identity of the controller, the purposes of processing, retention periods, and their rights.
4.2 The organization must respond to access requests, providing a copy of the individual's personal data within one month.
4.3 The organization must rectify inaccurate personal data on request without undue delay.
4.4 The organization must erase personal data on request ("right to erasure") where the data is no longer necessary, consent is withdrawn, or processing is unlawful, unless a legal obligation requires retention.
4.5 The organization should provide personal data in a portable, machine-readable format on request.

Section 5 — Special categories
5.1 Processing of special categories of personal data (health, biometric, religious, political, sexual orientation data) is prohibited unless an explicit exception applies, such as explicit consent.
5.2 Where special category data is processed, additional safeguards should be documented.`;

const PRIVACY_POLICY = `EMPLOYEE DATA PRIVACY POLICY — Meridian Software Ltd. (v2.3, synthetic sample)

1. Purpose and scope
This policy governs the collection, use, and protection of personal data of employees, contractors, and job applicants at Meridian Software Ltd. It applies to all departments and systems that store workforce data.

2. What we collect and why
We collect identification details (name, address, national ID number), employment records (contracts, performance reviews, disciplinary records), payroll and banking details, and system access logs. Each HR system owner documents the business purpose of the data held in their system in the HR Data Register, which also lists data categories and internal recipients. Data is collected only where needed for employment administration, legal compliance, or the operation of company systems. Managers may not repurpose employee data for new uses without approval from the Data Governance Board.

3. Lawful basis and transparency
The lawful basis for processing (contract performance, legal obligation, or legitimate interest) is recorded in the HR Data Register for each processing activity. New employees receive a Privacy Notice on their first day describing what data we hold, why we process it, who the controller is, and how to raise concerns. The notice is available on the intranet at all times.

4. Data quality
Employees can review and update their personal details at any time through the HR self-service portal. HR performs an annual accuracy review of core records. Corrections requested by an employee are applied within five working days.

5. Security measures
All HR systems require single sign-on with multi-factor authentication. Access is role-based and reviewed quarterly. Payroll and banking data are encrypted at rest; all data in transit uses TLS 1.2 or higher. Laptops are full-disk encrypted. Security incidents involving personal data must be reported to the Security Operations Center immediately.

6. Access requests
Employees may request a copy of their personal data by emailing the HR Privacy Desk. The desk acknowledges requests within three working days and aims to fulfil them within thirty calendar days, providing records in PDF format.

7. Consent
Where we run optional programs (wellness initiatives, internal photography, alumni networks), participation is by opt-in consent collected through a standalone form written in plain language. A consent withdrawal link is included in every program communication and withdrawal takes effect within five working days.

8. Special categories
Health information is processed only by the Occupational Health team for fitness-for-work assessments and workplace adjustments, under explicit employee consent, and is stored in a segregated system with restricted access. No biometric data is collected.

9. Third parties
Payroll processing is outsourced to an accredited provider under a data processing agreement. The HR Data Register lists all external recipients.

10. Governance
The Data Governance Board reviews this policy annually. Compliance questions go to privacy@meridian-software.example.`;

const SOC2_REGULATION = `SIMPLIFIED SERVICE ORGANIZATION SECURITY CONTROLS (modeled loosely on SOC 2 Type II common criteria — synthetic summary, not the AICPA text)

Control area CC1 — Governance
CC1.1 The organization must assign ownership of information security to a named role with board-level reporting.
CC1.2 Security policies must be reviewed and approved at least annually.

Control area CC2 — Access management
CC2.1 The organization must enforce unique user IDs and multi-factor authentication for all access to production systems.
CC2.2 Access rights must follow least privilege and be revoked within 24 hours of termination.
CC2.3 The organization must perform periodic (at least quarterly) reviews of user access rights, with evidence retained.
CC2.4 Privileged (administrative) access must be logged, and the logs must be protected from modification.

Control area CC3 — Change management
CC3.1 Changes to production systems must follow a documented change process including testing and approval before deployment.
CC3.2 Emergency changes must be documented retrospectively within a defined period.

Control area CC4 — Operations and monitoring
CC4.1 The organization must monitor systems for security events and define alerting thresholds.
CC4.2 System capacity and availability must be monitored against defined objectives.
CC4.3 Backups of critical data must be performed on a defined schedule and restoration must be tested at least annually.

Control area CC5 — Incident response
CC5.1 The organization must maintain a documented incident response plan with defined roles and severity levels.
CC5.2 Incidents must be tracked to resolution, with root-cause analysis for high-severity incidents.
CC5.3 The incident response plan must be tested (tabletop or simulation) at least annually.
CC5.4 Affected customers must be notified of incidents impacting their data within a contractually defined timeframe.

Control area CC6 — Risk and vendors
CC6.1 The organization must perform a formal security risk assessment at least annually.
CC6.2 Vendors with access to production data must be assessed for security posture before onboarding and periodically thereafter.`;

const SECURITY_POLICY = `INFORMATION TECHNOLOGY SECURITY POLICY — Bluepeak Analytics Inc. (v4.1, synthetic sample)

1. Purpose
This policy defines security requirements for Bluepeak Analytics' corporate and production environments. It applies to all staff, contractors, and systems.

2. Governance
The Chief Information Security Officer (CISO) owns this policy and information security across the company, and reports quarterly to the executive team. The policy is reviewed by the CISO's office when significant changes to systems or threats occur.

3. Identity and access
All systems require unique named accounts; shared accounts are prohibited. Multi-factor authentication is mandatory for VPN, email, and all production system access. Access follows the principle of least privilege and is granted through role profiles approved by system owners. When an employee leaves, IT disables accounts as part of the offboarding checklist processed by HR, normally within three business days. Administrative actions on production infrastructure are captured in the central audit log service, which is append-only and access-restricted.

4. Change management
All production changes go through the engineering change pipeline: peer-reviewed pull request, automated test suite, staging deployment, and release approval by the on-call lead. Emergency hotfixes may bypass staging with VP Engineering approval and must be retro-documented in the change log within 48 hours.

5. Monitoring and operations
The platform team operates centralized logging and a SIEM with alerting rules for authentication anomalies, privilege escalation, and data exfiltration patterns. On-call engineers respond to alerts around the clock. Service availability is tracked against published SLOs with monthly reporting. Production databases are backed up nightly with 35-day retention; backups are encrypted.

6. Incident response
Bluepeak maintains an Incident Response Plan covering detection, triage, severity classification (SEV1-SEV4), communication, and resolution. The plan names an Incident Commander rotation and defines escalation paths. All SEV1 and SEV2 incidents receive a written post-mortem with root-cause analysis and tracked action items. Customer notification for data-impacting incidents is handled by the legal team according to the terms of each customer contract.

7. Risk management
The security team maintains a risk register reviewed at the CISO's discretion. Penetration tests are commissioned before major product launches.

8. Vendor security
Procurement requires vendors handling customer data to complete a security questionnaire before onboarding. High-risk vendors require SOC 2 reports or equivalent evidence.

9. Acceptable use and training
Staff complete security awareness training at hire and annually thereafter. Phishing simulations run quarterly.

10. Exceptions
Exceptions to this policy require written CISO approval with an expiry date and compensating controls.`;

export const SAMPLE_PAIRS: SamplePair[] = [
  {
    name: "Data Privacy Policy vs GDPR (simplified)",
    policy: {
      title: "Employee Data Privacy Policy — Meridian Software",
      content: PRIVACY_POLICY,
      type: "policy",
    },
    regulation: {
      title: "GDPR Articles 5-9 (simplified summary)",
      content: GDPR_REGULATION,
      type: "regulation",
    },
  },
  {
    name: "IT Security Policy vs SOC 2 (simplified)",
    policy: {
      title: "IT Security Policy — Bluepeak Analytics",
      content: SECURITY_POLICY,
      type: "policy",
    },
    regulation: {
      title: "SOC 2 Type II Controls (simplified summary)",
      content: SOC2_REGULATION,
      type: "regulation",
    },
  },
];
