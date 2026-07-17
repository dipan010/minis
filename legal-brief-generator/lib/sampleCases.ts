import type { CaseInput } from "./types";

/** Three fictional sample cases covering different jurisdictions, areas of
 * law, and client positions. */
export const SAMPLE_CASES: CaseInput[] = [
  {
    title: "Breach of Software License Agreement",
    jurisdiction: "US_Federal",
    area_of_law: "contract",
    client_position: "plaintiff",
    desired_outcome:
      "Recover unpaid license fees for the overage period, obtain an injunction against continued out-of-scope use, and secure audit rights going forward.",
    key_issues: ["license scope", "damages calculation", "audit clause enforceability"],
    facts:
      "Our client, Veridian Systems Inc., is a SaaS vendor that licensed its data-pipeline platform to Corvex Analytics LLC under a 2023 master license agreement. The agreement capped usage at 50 named production workloads and expressly prohibited deployment in Corvex's affiliate entities without a written amendment. In March 2025, telemetry produced under the agreement's audit clause showed 143 active production workloads, of which 61 were running inside two Corvex affiliates. Corvex was invoiced for the overage at the contractual rate; it refused payment, asserting that the workload definition is ambiguous and that the telemetry clause only permits collection of aggregate statistics. Corvex continued expanding usage after receiving a cure notice in April 2025. The agreement contains a fee schedule for excess usage, a 30-day cure period, New York choice of law, and a prevailing-party attorneys' fee clause.",
  },
  {
    title: "Workplace Discrimination Claim — Wrongful Termination",
    jurisdiction: "US_State",
    area_of_law: "employment",
    client_position: "plaintiff",
    desired_outcome:
      "Establish age discrimination as the motivating factor in the termination, recover back pay and emotional-distress damages, and obtain reinstatement or front pay.",
    key_issues: ["pretext", "comparator evidence", "documentation gaps"],
    facts:
      "Our client, Diane Okafor, 58, was employed for 19 years as a regional operations manager at Brightline Logistics, most recently receiving an 'exceeds expectations' review eight months before termination. In January 2025 a newly appointed VP reorganized the division, and in meetings referred to needing 'digital-native energy' and 'a bench with a longer runway.' Three managers over 55 were terminated in the reorganization; their duties were absorbed by employees aged 31-38, two of whom were hired within 90 days of the terminations. The company cites a reduction in force and performance concerns, but no contemporaneous performance documentation exists for our client, and the RIF selection matrix was created after the termination decisions were communicated to HR. Our client timely filed with the state civil rights agency and received a right-to-sue letter.",
  },
  {
    title: "Patent Infringement Defense — Mobile Technology",
    jurisdiction: "India",
    area_of_law: "ip",
    client_position: "defendant",
    desired_outcome:
      "Defeat the infringement claim through invalidity and non-infringement defenses, avoid an interim injunction that would halt product sales, and position for a favorable early settlement if needed.",
    key_issues: ["prior art", "claim construction", "non-practicing entity conduct"],
    facts:
      "Our client, Dhruva Mobility Pvt. Ltd., is a Bengaluru startup selling a budget smartphone line with a battery-optimization feature that throttles background processes based on usage patterns. Meridian IP Holdings, a non-practicing entity that acquired a 2013-priority Indian patent covering 'adaptive power management via application usage classification,' has sued for infringement in the Delhi High Court and sought an interim injunction. Our engineers developed the feature independently in 2023, and its classification step operates on-device using an ML model rather than the rule-table method described in the patent's claims and specification. Prior art includes a 2011 academic paper describing usage-based process throttling and a 2012 open-source Android mod implementing similar behavior. Meridian has filed six similar suits against device makers in the last two years, settling five before claim construction. Our client's entire revenue depends on continued sales of the accused product line.",
  },
];
