import type { SupplyChainReport } from "./types";

/** Three pre-built reports so the dashboard demos instantly without Ollama.
 * Every company, supplier, and event is fictional. */
export const SAMPLE_REPORTS: SupplyChainReport[] = [
  {
    company: "TechCorp Global",
    esg: { environmental: 61, social: 58, governance: 41, overall: 52 },
    risk_trend: "deteriorating",
    confidence: 78,
    top_risks: [
      "Board-level governance failures — an undisclosed related-party sourcing arrangement and a delayed audit signal weak oversight of procurement.",
      "Concentration risk in a single Shenzhen PCB supplier that has now missed two consecutive quarterly quality audits.",
      "Rising regulatory exposure from new EU conflict-minerals due-diligence rules the company has not yet evidenced compliance with.",
    ],
    recommendations: [
      "Commission an independent forensic review of procurement contracts touched by the related-party arrangement.",
      "Qualify a second PCB supplier outside the Pearl River Delta within two quarters to break single-source dependency.",
      "Stand up a conflict-minerals traceability program (smelter-level) ahead of the EU due-diligence enforcement date.",
      "Add audit-rights and ESG-disclosure clauses to the top 20 supplier contracts at renewal.",
      "Institute quarterly board reporting on supplier audit failures with mandatory remediation timelines.",
    ],
    risk_events: [
      { id: "evt-1", date: "2026-06-28", title: "TechCorp Global delays annual audit filing for second time", summary: "The electronics maker pushed back its audited annual report citing 'procurement documentation gaps'. Analysts flagged the delay as unusual for a company of its size. Shares slipped 3% on the news.", category: "governance", severity: 4, source: "Bloomberg" },
      { id: "evt-2", date: "2026-06-11", title: "Undisclosed related-party supplier ties surface at TechCorp", summary: "A filing review revealed a board member's family firm, Meridian Components, has supplied connectors since 2024 without disclosure. The company says the contracts were at arm's length.", category: "governance", severity: 5, source: "Financial Times", affected_suppliers: ["Meridian Components"] },
      { id: "evt-3", date: "2026-05-30", title: "Shenzhen PCB supplier fails second consecutive quality audit", summary: "Kaiyuan Circuit Co., TechCorp's sole PCB source, failed follow-up audit checks on solder integrity and cleanroom controls. TechCorp said corrective plans are 'on track'.", category: "operational", severity: 4, source: "Nikkei Asia", affected_suppliers: ["Kaiyuan Circuit Co."] },
      { id: "evt-4", date: "2026-05-14", title: "EU adopts stricter conflict-minerals due-diligence regime", summary: "New rules require smelter-level traceability for tantalum and tin in consumer electronics sold in the EU from 2027. Compliance costs for mid-size OEMs are estimated at 1-2% of COGS.", category: "regulatory", severity: 3, source: "Reuters" },
      { id: "evt-5", date: "2026-04-22", title: "Warehouse workers strike at TechCorp's Penang distribution hub", summary: "Roughly 400 workers walked out over shift-scheduling changes. The 4-day strike delayed regional shipments before a settlement added rest-day guarantees.", category: "social", severity: 3, source: "local news wire" },
      { id: "evt-6", date: "2026-04-03", title: "Chip packaging supplier hit by export-control tightening", summary: "New licensing requirements on advanced packaging equipment slowed capacity expansion at TechCorp supplier Novapack Semiconductors, raising lead-time risk for premium product lines.", category: "geopolitical", severity: 3, source: "Reuters", affected_suppliers: ["Novapack Semiconductors"] },
      { id: "evt-7", date: "2026-03-18", title: "Wastewater permit violation at Dongguan casing plant", summary: "Local environment bureau fined a TechCorp casing supplier for exceeding nickel discharge limits. The supplier committed to a treatment-line upgrade by Q4.", category: "environmental", severity: 2, source: "industry trade press", affected_suppliers: ["Lianhe Precision Casings"] },
      { id: "evt-8", date: "2026-02-25", title: "TechCorp launches supplier code-of-conduct refresh", summary: "The company published an updated supplier code adding living-wage language and unannounced audit rights, drawing cautious praise from sustainability analysts.", category: "social", severity: 1, source: "industry trade press" },
      { id: "evt-9", date: "2026-02-02", title: "Logistics disruption as Red Sea rerouting stretches lead times", summary: "Container rerouting added 9-12 days to Europe-bound shipments. TechCorp increased safety stock at its Rotterdam hub, tying up working capital.", category: "operational", severity: 2, source: "Bloomberg" },
      { id: "evt-10", date: "2026-01-15", title: "Proxy adviser flags TechCorp board independence concerns", summary: "A leading proxy advisory firm recommended votes against two directors, citing tenure and interlocking relationships with suppliers.", category: "governance", severity: 3, source: "Financial Times" },
    ],
  },
  {
    company: "GreenHarvest Foods",
    esg: { environmental: 34, social: 55, governance: 68, overall: 47 },
    risk_trend: "stable",
    confidence: 74,
    top_risks: [
      "Severe environmental exposure — repeated pesticide-runoff violations and a deforestation-linked palm oil supplier dominate the event stream.",
      "Water-stress concentration: 60% of tomato volume comes from a single drought-hit basin, with irrigation permits under review.",
      "EU deforestation regulation (EUDR) enforcement could block palm-oil-derived SKUs lacking plot-level traceability.",
    ],
    recommendations: [
      "Suspend and re-audit the flagged palm oil supplier; require plot-level geolocation data as a condition of reinstatement.",
      "Diversify tomato sourcing across at least two additional water basins before next growing season.",
      "Fund pesticide-management retrofits and buffer-strip planting with the two repeat-violation growers.",
      "Build EUDR-compliant traceability (geo-coordinates + due-diligence statements) for all forest-risk commodities.",
      "Publish a time-bound water-stewardship target covering the top 10 agricultural suppliers.",
    ],
    risk_events: [
      { id: "evt-1", date: "2026-07-01", title: "GreenHarvest palm oil supplier linked to new forest clearance", summary: "Satellite monitoring NGO reported 180 hectares of clearance inside a concession operated by Sawit Lestari Group, a GreenHarvest supplier. The company said it is investigating.", category: "environmental", severity: 5, source: "Reuters", affected_suppliers: ["Sawit Lestari Group"] },
      { id: "evt-2", date: "2026-06-09", title: "Second pesticide runoff citation for Central Valley grower", summary: "A repeat violation for chlorpyrifos runoff was issued to Rios Farms, which supplies 15% of GreenHarvest's processing tomatoes. Remediation deadline set for September.", category: "environmental", severity: 4, source: "local news wire", affected_suppliers: ["Rios Farms"] },
      { id: "evt-3", date: "2026-05-21", title: "Drought triggers irrigation permit review in key sourcing basin", summary: "Regulators opened a review of agricultural water allocations in the basin supplying the majority of GreenHarvest's tomato volume, raising availability risk for the 2027 season.", category: "environmental", severity: 4, source: "Bloomberg" },
      { id: "evt-4", date: "2026-05-05", title: "Migrant labor housing complaints at partner packing facility", summary: "Workers at a contracted packing house reported overcrowded seasonal housing. GreenHarvest ordered an unannounced social audit and results are pending.", category: "social", severity: 3, source: "industry trade press", affected_suppliers: ["Valle Verde Packing"] },
      { id: "evt-5", date: "2026-04-12", title: "EUDR enforcement guidance published for food importers", summary: "The EU issued final guidance requiring plot-level geolocation for palm oil and cocoa imports. Importers without traceability face consignment blocks from December 2026.", category: "regulatory", severity: 4, source: "Financial Times" },
      { id: "evt-6", date: "2026-03-27", title: "GreenHarvest completes regenerative-agriculture pilot", summary: "A 40-farm cover-cropping pilot cut synthetic fertilizer use 18% with stable yields, and the company plans a phased expansion — a rare positive signal in its environmental record.", category: "environmental", severity: 1, source: "industry trade press" },
      { id: "evt-7", date: "2026-03-02", title: "Port workers' slowdown delays refrigerated exports", summary: "A week-long work-to-rule action at the main export port delayed chilled shipments; spoilage losses were minor but contract penalties applied on two retail accounts.", category: "operational", severity: 2, source: "local news wire" },
      { id: "evt-8", date: "2026-02-08", title: "Cocoa sourcing region hit by export levy dispute", summary: "A producer-country levy dispute briefly halted cocoa export registrations, exposing GreenHarvest's confectionery line to spot-market pricing.", category: "geopolitical", severity: 2, source: "Reuters" },
      { id: "evt-9", date: "2026-01-19", title: "GreenHarvest names first chief sustainability officer", summary: "The appointment consolidates ESG accountability at the executive level, with supplier compliance moved under the new office.", category: "governance", severity: 1, source: "Bloomberg" },
    ],
  },
  {
    company: "SteelBridge Industries",
    esg: { environmental: 57, social: 62, governance: 66, overall: 60 },
    risk_trend: "deteriorating",
    confidence: 71,
    top_risks: [
      "Geopolitical fragmentation of the supply chain — tariff escalation and export-license friction now touch three of five key input flows (ore, ferroalloys, precision castings).",
      "Single-corridor dependence on Black Sea shipping for 40% of ferroalloy volume, which has already forced two spot re-routings this year.",
      "Carbon border adjustment (CBAM) cost exposure on EU-bound structural steel from coal-based upstream smelting.",
    ],
    recommendations: [
      "Qualify a ferroalloy source with non-Black-Sea logistics (e.g. Southern African corridor) for at least 25% of volume.",
      "Model CBAM cost pass-through by product line and open low-carbon-input negotiations with the two upstream smelters.",
      "Create a tariff war-room playbook: pre-classified alternates and bonded-warehouse options for the top 15 HS codes.",
      "Negotiate force-majeure and re-routing cost-sharing clauses into 2027 freight contracts.",
      "Increase strategic inventory of precision castings to 60 days while the export-license backlog persists.",
    ],
    risk_events: [
      { id: "evt-1", date: "2026-06-20", title: "New 20% tariff imposed on imported structural steel components", summary: "A sweeping tariff round covers fabricated sections SteelBridge imports for its bridge-module business, compressing margins on fixed-price public contracts.", category: "geopolitical", severity: 4, source: "Reuters" },
      { id: "evt-2", date: "2026-06-02", title: "Export-license backlog delays precision castings from key supplier", summary: "Licensing delays at Danube Precision Cast have stretched deliveries by five weeks. SteelBridge invoked schedule-relief clauses on two projects.", category: "geopolitical", severity: 4, source: "Financial Times", affected_suppliers: ["Danube Precision Cast"] },
      { id: "evt-3", date: "2026-05-17", title: "Black Sea insurance premiums spike after shipping incident", summary: "War-risk premiums rose sharply, adding cost to SteelBridge's ferroalloy imports and prompting a second spot re-routing this year via longer Mediterranean legs.", category: "operational", severity: 3, source: "Bloomberg" },
      { id: "evt-4", date: "2026-04-29", title: "CBAM transitional reporting flags SteelBridge's upstream carbon intensity", summary: "Disclosed embedded-emissions figures for EU-bound steel were above sector median due to coal-based smelting at two upstream suppliers, implying material 2027 certificate costs.", category: "regulatory", severity: 4, source: "Financial Times", affected_suppliers: ["Hutan Metals", "Orestal Smelting"] },
      { id: "evt-5", date: "2026-04-08", title: "Furnace outage halts output at ferroalloy plant for 10 days", summary: "An unplanned furnace reline at Orestal Smelting cut monthly ferroalloy supply about 8%; SteelBridge covered the gap at spot prices.", category: "operational", severity: 2, source: "industry trade press", affected_suppliers: ["Orestal Smelting"] },
      { id: "evt-6", date: "2026-03-15", title: "Union agreement averts strike at SteelBridge's main fabrication yard", summary: "A three-year agreement with a 5% first-year raise settled without industrial action, though overtime provisions remain contested.", category: "social", severity: 2, source: "local news wire" },
      { id: "evt-7", date: "2026-02-19", title: "Iron ore port congestion adds two-week queues", summary: "Seasonal congestion plus customs system migration produced vessel queues at the primary ore import terminal, drawing down mill safety stocks.", category: "operational", severity: 2, source: "Nikkei Asia" },
      { id: "evt-8", date: "2026-01-28", title: "Anti-dumping probe opened into rebar imports from two source countries", summary: "The investigation covers a category adjacent to SteelBridge's imports; preliminary duties, if extended, could raise input costs next year.", category: "regulatory", severity: 3, source: "Reuters" },
      { id: "evt-9", date: "2026-01-10", title: "SteelBridge publishes first scope-3 emissions inventory", summary: "The inventory, covering 80% of purchased steel by mass, was assured at limited level — a governance positive that also quantifies its CBAM exposure.", category: "governance", severity: 1, source: "industry trade press" },
    ],
  },
];
