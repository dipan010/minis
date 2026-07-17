import type { ResearchReport, ReviewResult } from "./types";

export interface SampleResearch {
  question: string;
  report: ResearchReport;
  review: ReviewResult;
}

/** Three pre-built research runs so the UI demos instantly without Ollama.
 * All content — including references — is illustrative and AI-written. */
export const SAMPLE_RESEARCH: SampleResearch[] = [
  {
    question: "What are the economic impacts of remote work on mid-size cities?",
    review: {
      score: 84,
      feedback: [
        "Section 2 could quantify the commercial real estate effect with a clearer range of estimates.",
        "The conclusion slightly overstates the certainty of long-term migration persistence; hedge it.",
      ],
    },
    report: {
      title: "Remote Work and the Economic Reshaping of Mid-Size Cities",
      abstract:
        "This report examines how the normalization of remote and hybrid work has redistributed economic activity toward mid-size cities. It synthesizes findings on migration flows, housing markets, commercial real estate, local labor markets, and municipal finances. The evidence indicates that mid-size cities with strong amenities and connectivity captured a durable share of high-income remote workers, lifting housing demand and local service employment, while their downtown office segments and transit-dependent businesses faced milder versions of the disruptions seen in large metros. The net fiscal effect is modestly positive for receiving cities but uneven and sensitive to housing supply responses.",
      sections: [
        {
          heading: "Migration and Population Flows",
          content:
            "The shift to remote work loosened the tie between residence and employer location, and mid-size cities were the primary beneficiaries. Domestic migration data over the post-2020 period show sustained net inflows into cities in the 100,000–500,000 population band, particularly those within a few hours of major metros or offering outdoor and cultural amenities. Inflowing households skewed toward higher-income knowledge workers, which amplified their per-capita economic impact relative to headline population numbers. Importantly, the flows appear to be a step-change rather than a transient spike: hybrid schedules of one to three office days a week made 'commutable-occasionally' geographies viable, locking in relocation decisions.",
          findings: ["Finding 1"],
        },
        {
          heading: "Housing Markets and Cost of Living",
          content:
            "Housing absorbed the largest share of the remote-work shock. Mid-size cities with inelastic housing supply experienced price and rent appreciation well above national averages, compressing affordability for incumbent residents whose wages are set locally rather than in remote labor markets. Cities that permitted rapid infill and multifamily construction converted the demand into tax base and construction employment instead of pure price inflation. The distributional consequence is a consistent theme: existing homeowners captured windfall gains while renters and service workers bore higher costs, prompting several receiving cities to pair remote-worker attraction programs with affordability initiatives.",
          findings: ["Finding 2"],
        },
        {
          heading: "Local Labor Markets and Services",
          content:
            "Remote workers import external salaries and spend them locally, functioning economically like a persistent export industry. Consumer-facing sectors — food service, personal services, healthcare, home improvement — expanded employment in receiving cities, and daytime neighborhood spending partially replaced the downtown lunch economy. At the same time, local employers report wage pressure as remote openings at national pay scales compete for the same talent pool, a benefit to workers but a margin squeeze for locally-priced firms. Several mid-size cities also saw measurable startup formation gains as relocated professionals launched ventures where their housing cost base was lower.",
          findings: ["Finding 3", "Finding 4"],
        },
        {
          heading: "Commercial Real Estate and Municipal Finance",
          content:
            "The office segment is the clearest loser, though mid-size cities entered the shock with smaller and cheaper office inventories than large metros, making conversion economics somewhat more favorable. Municipal finances show offsetting flows: property tax bases rose with residential values while downtown-linked revenues (parking, transit fares, commercial assessments) weakened. On net, most receiving mid-size cities report stable-to-improved fiscal positions, but the composition shift matters — revenues are now more exposed to residential property cycles and less diversified across commercial classes.",
          findings: ["Finding 4", "Finding 5"],
        },
      ],
      conclusion:
        "Remote work has, on balance, transferred economic vitality from the largest metros toward mid-size cities, arriving as higher-income residents, housing demand, local service employment, and entrepreneurship. The gains are real but conditional: they concentrate in cities with amenities, connectivity, and — critically — housing supply responsiveness, and they carry distributional costs for incumbent renters. For most receiving cities the net economic impact is positive and likely durable under hybrid-work norms, though its magnitude depends on policy choices made in the next several years.",
      limitations: [
        "Findings are AI-generated syntheses from training knowledge, not a literature review of specific studies.",
        "No access to current-year migration or real estate data; recent reversals would not be captured.",
        "Effects are generalized across mid-size cities; individual cities vary widely.",
      ],
      simulated_references: [
        { id: 1, text: "National migration-trends analysis of post-pandemic domestic relocation flows (simulated reference)." },
        { id: 2, text: "Regional housing market study on remote-worker in-migration and price elasticity (simulated reference)." },
        { id: 3, text: "Municipal finance review of mid-size city revenue composition shifts (simulated reference)." },
        { id: 4, text: "Labor-economics working paper on remote wage arbitrage and local wage pressure (simulated reference)." },
      ],
      metadata: {
        question: "What are the economic impacts of remote work on mid-size cities?",
        depth: "standard",
        agents_used: 4,
        total_steps: 14,
        generation_time_ms: 187_000,
      },
    },
  },
  {
    question: "Compare quantum computing approaches: superconducting vs trapped ion",
    review: {
      score: 88,
      feedback: [
        "Add a sentence on photonic/neutral-atom approaches to acknowledge the comparison's scope limit.",
        "Gate-fidelity figures should be labeled as approximate ranges.",
      ],
    },
    report: {
      title: "Superconducting versus Trapped-Ion Quantum Computing: A Comparative Assessment",
      abstract:
        "This briefing compares the two leading gate-based quantum computing platforms — superconducting circuits and trapped ions — across physical principles, gate speed and fidelity, connectivity, scalability, and error-correction outlook. Superconducting platforms lead in gate speed, fabrication maturity, and demonstrated qubit counts, while trapped ions lead in coherence times, gate fidelity, and all-to-all connectivity within a trap. Neither platform dominates: superconducting systems face wiring and yield challenges at scale, while trapped ions face slow gates and the complexity of shuttling or photonic interconnects. The most likely medium-term outcome is continued coexistence with different sweet spots.",
      sections: [
        {
          heading: "Physical Principles and Qubit Properties",
          content:
            "Superconducting qubits are engineered anharmonic oscillators fabricated on chips and operated at millikelvin temperatures, with states manipulated by microwave pulses. Their character is that of a manufactured device: parameters are set by fabrication, enabling design freedom but introducing device-to-device variability. Trapped-ion qubits are individual atomic ions confined by electromagnetic fields, with information stored in long-lived internal states and manipulated by lasers or microwaves. Because every ion of a species is identical, trapped-ion qubits are intrinsically uniform and exhibit coherence times orders of magnitude longer than superconducting qubits — seconds to minutes versus tens to hundreds of microseconds.",
          findings: ["Finding 1"],
        },
        {
          heading: "Gate Speed, Fidelity, and Connectivity",
          content:
            "Superconducting two-qubit gates complete in tens to hundreds of nanoseconds, roughly three to four orders of magnitude faster than trapped-ion gates, which typically run in the tens to hundreds of microseconds. Trapped ions counter with fidelity: approximate two-qubit fidelities of 99.9% or better have been demonstrated in small ion systems, versus approximately 99.0–99.7% typical for superconducting processors. Connectivity also differs structurally — superconducting chips are usually limited to nearest-neighbor coupling on a lattice, requiring swap overhead, while ions in a shared trap interact via collective motional modes, giving effective all-to-all connectivity within a chain.",
          findings: ["Finding 2"],
        },
        {
          heading: "Scalability Pathways",
          content:
            "Superconducting platforms scale by leveraging semiconductor-style fabrication, and processors in the hundreds-to-thousands of physical qubits exist; the binding constraints are control wiring, cryogenic capacity, crosstalk, and fabrication yield, with modular multi-chip and cryo-link approaches under development. Trapped-ion systems scale by a different route: chains beyond a few dozen ions become unwieldy, so architectures rely on the quantum charge-coupled device model — shuttling ions between trap zones — or photonic interconnects between traps. Both pathways are engineering-intensive, and both communities have shifted rhetoric from raw qubit counts toward error-corrected logical qubits.",
          findings: ["Finding 3"],
        },
        {
          heading: "Error Correction and Application Outlook",
          content:
            "Fast gates give superconducting platforms an advantage in error-correction cycle time, which matters because logical qubits require repeated syndrome extraction; demonstrations of below-threshold surface-code operation have come first on superconducting hardware. Trapped ions' higher physical fidelities mean fewer physical qubits per logical qubit in principle, but slow cycles constrain logical clock speed. In applications, superconducting systems suit algorithms tolerant of shallow circuits at scale, while trapped ions excel where circuit depth and fidelity dominate, such as precision simulation of small systems. Hybrid usage through cloud access is already normal practice.",
          findings: ["Finding 4"],
        },
      ],
      conclusion:
        "The comparison resolves not to a winner but to a division of strengths: superconducting circuits offer speed and manufacturing scale; trapped ions offer fidelity, uniformity, and connectivity. Error-corrected utility will likely arrive first on whichever platform best converts its native advantage — cycle speed or physical fidelity — into cheap logical qubits, and current evidence gives superconducting a tempo lead while trapped ions retain a quality lead.",
      limitations: [
        "Fidelity and coherence figures are approximate ranges from training knowledge, not current benchmarks.",
        "The comparison excludes photonic, neutral-atom, and topological approaches.",
        "Vendor-specific roadmap claims are deliberately avoided and may change the picture.",
      ],
      simulated_references: [
        { id: 1, text: "Review article on superconducting qubit engineering and coherence (simulated reference)." },
        { id: 2, text: "Survey of trapped-ion quantum computing architectures and QCCD scaling (simulated reference)." },
        { id: 3, text: "Comparative benchmarking study of two-qubit gate fidelities across platforms (simulated reference)." },
        { id: 4, text: "Analysis of surface-code error-correction demonstrations on superconducting hardware (simulated reference)." },
      ],
      metadata: {
        question: "Compare quantum computing approaches: superconducting vs trapped ion",
        depth: "standard",
        agents_used: 4,
        total_steps: 13,
        generation_time_ms: 203_000,
      },
    },
  },
  {
    question: "How is AI changing drug discovery timelines?",
    review: {
      score: 81,
      feedback: [
        "Section 3 conflates preclinical acceleration with overall timeline reduction; the clinical-trial bottleneck deserves earlier emphasis.",
        "Add explicit caveat that AI-designed drug approval evidence is still thin.",
      ],
    },
    report: {
      title: "Artificial Intelligence and the Compression of Drug Discovery Timelines",
      abstract:
        "This report assesses where artificial intelligence is genuinely shortening drug discovery and development timelines and where claims outrun evidence. AI methods have demonstrably compressed early discovery — target identification, molecular design, and lead optimization — in some cases reducing multi-year phases to months. Structure prediction has removed a major experimental bottleneck, and generative chemistry expands searchable molecular space. However, the dominant share of a drug's decade-long journey lies in clinical trials, where AI's impact remains incremental (site selection, patient recruitment, trial design). The realistic near-term effect is a meaningful compression of preclinical timelines and attrition, not a wholesale halving of end-to-end development.",
      sections: [
        {
          heading: "Where Time Goes in Traditional Drug Development",
          content:
            "A conventional program spends roughly three to six years from target selection through preclinical candidate nomination, followed by six to eight years of clinical trials and regulatory review. Attrition compounds the calendar: the large majority of candidates fail, so expected timelines embed repeated restarts. Any technology's leverage on the total timeline therefore depends on which segment it accelerates and whether it reduces failure rates — a distinction central to evaluating AI claims, since early-phase acceleration alone leaves the clinical majority of the timeline untouched.",
          findings: ["Finding 1"],
        },
        {
          heading: "AI in Target Discovery and Molecular Design",
          content:
            "The clearest, best-documented gains are in early discovery. Machine-learning models mine omics, literature, and clinical data to propose and prioritize targets, while protein structure prediction now supplies in hours what crystallography delivered in months or years. Generative models design candidate molecules against a target profile and, combined with automated synthesis and testing loops, have produced development candidates in under eighteen months in publicized programs — against a historical norm of three to five years for the same stages. These are real compressions, though selection effects in reported cases warrant caution.",
          findings: ["Finding 2", "Finding 3"],
        },
        {
          heading: "The Clinical Bottleneck",
          content:
            "Clinical development resists compression because its clock is biological and regulatory rather than computational: dosing periods, patient follow-up, and safety review cannot be simulated away. AI's current clinical contributions are logistical — predicting which sites will recruit, matching eligible patients, optimizing protocol design, and enabling adaptive trials — each shaving months rather than years. The larger prospective lever is attrition: if AI-selected targets and molecules fail less often in trials, expected end-to-end timelines fall substantially even with unchanged trial durations. Evidence on this point is early; the first cohorts of AI-originated candidates are only now moving through mid-stage trials, with mixed but not conclusive results.",
          findings: ["Finding 4"],
        },
        {
          heading: "Net Effect on Timelines",
          content:
            "Synthesizing the segments: preclinical timelines are being compressed by roughly one to three years in favorable programs, clinical logistics by months, and the attrition effect remains a promissory note. Aggregate industry timelines have not yet visibly shortened in approval statistics — unsurprising given the decade lag between discovery innovation and approval counts. The reasonable base case is that AI shifts drug discovery from a ten-to-fifteen-year norm toward an eight-to-twelve-year norm over the coming decade, with larger gains if early-stage quality improvements translate into higher clinical success rates.",
          findings: ["Finding 1", "Finding 4"],
        },
      ],
      conclusion:
        "AI is genuinely changing drug discovery timelines, but asymmetrically: dramatic compression in preclinical discovery, incremental gains in clinical logistics, and a potentially transformative but unproven effect on attrition. End-to-end timelines will shorten meaningfully only as those early-stage improvements demonstrate higher clinical success rates — the evidence to watch over the next few years.",
      limitations: [
        "Findings are AI-generated syntheses, not a systematic review; publicized AI-pharma timelines are subject to selection bias.",
        "Approval-stage evidence for AI-originated drugs is inherently lagged and thin at time of writing.",
        "Timeline figures are approximate industry norms, not program-level data.",
      ],
      simulated_references: [
        { id: 1, text: "Industry analysis of drug development phase durations and attrition rates (simulated reference)." },
        { id: 2, text: "Case-study compilation of generative-chemistry candidate nomination timelines (simulated reference)." },
        { id: 3, text: "Review of protein structure prediction impact on structural biology workflows (simulated reference)." },
        { id: 4, text: "Assessment of machine learning applications in clinical trial operations (simulated reference)." },
      ],
      metadata: {
        question: "How is AI changing drug discovery timelines?",
        depth: "standard",
        agents_used: 4,
        total_steps: 14,
        generation_time_ms: 195_000,
      },
    },
  },
];
