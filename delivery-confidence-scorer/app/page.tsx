"use client";

import { useState } from "react";
import type {
  AddressType,
  DeliveryInput,
  DeliveryScore,
  RiskCategory,
  ServiceLevel,
} from "@/lib/types";
import { CARRIERS, COUNTRIES } from "@/lib/types";
import { SAMPLE_SCENARIOS } from "@/lib/sampleData";
import ConfidenceGauge, { RISK_LEVEL_COLOR } from "@/components/ConfidenceGauge";
import RiskCard from "@/components/RiskCard";

const EMPTY_INPUT: DeliveryInput = {
  address: {
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    type: "residential",
  },
  order: {
    weight_kg: 2,
    value_usd: 100,
    carrier: "UPS",
    service_level: "standard",
    requires_signature: false,
    fragile: false,
    delivery_window: { start: "", end: "" },
  },
};

const inputCls =
  "w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy";

const labelCls = "block text-[12px] font-medium text-ink-soft mb-1";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-3">
      <legend className="font-mono text-[11px] uppercase tracking-wide text-ink-soft pr-2">
        {title}
      </legend>
      <div className="mt-1 space-y-3">{children}</div>
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-navy" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4.5 translate-x-4" : "left-0.5 translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}

export default function Home() {
  const [input, setInput] = useState<DeliveryInput>(EMPTY_INPUT);
  const [useHistory, setUseHistory] = useState(false);
  const [history, setHistory] = useState({
    previous_deliveries: 0,
    successful: 0,
    avg_attempts: 1.0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<DeliveryScore | null>(null);
  const [scenarioName, setScenarioName] = useState<string | null>(null);

  function patchAddress(patch: Partial<DeliveryInput["address"]>) {
    setInput((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  }
  function patchOrder(patch: Partial<DeliveryInput["order"]>) {
    setInput((prev) => ({ ...prev, order: { ...prev.order, ...patch } }));
  }

  function loadScenario(index: number) {
    const scenario = SAMPLE_SCENARIOS[index];
    const copy = JSON.parse(JSON.stringify(scenario.input)) as DeliveryInput;
    setScenarioName(scenario.name);
    setScore(null);
    setError(null);
    setUseHistory(Boolean(copy.history));
    if (copy.history) setHistory({ ...copy.history });
    const { history: _history, ...rest } = copy;
    setInput(rest);
  }

  const canSubmit =
    input.address.city.trim().length > 0 &&
    input.address.zip.trim().length > 0 &&
    input.order.weight_kg > 0 &&
    !loading;

  async function handleScore() {
    setLoading(true);
    setError(null);
    setScore(null);

    const payload: DeliveryInput = {
      ...input,
      ...(useHistory && history.previous_deliveries > 0 ? { history } : {}),
    };

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
      } else {
        setScore(data as DeliveryScore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const groupedFactors = score
    ? score.risk_factors.reduce<Partial<Record<RiskCategory, typeof score.risk_factors>>>(
        (acc, f) => {
          (acc[f.category] ??= []).push(f);
          return acc;
        },
        {}
      )
    : null;

  return (
    <div className="min-h-screen">
      {/* ── Navy header ── */}
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60 mb-1">
            Pre-shipment risk assessment
          </p>
          <h1 className="text-2xl font-semibold">Delivery Confidence Scorer</h1>
          <p className="text-sm text-white/70 mt-1 max-w-2xl">
            Enter a destination and order metadata to predict delivery success
            likelihood and surface risk factors before the label is printed.
            Scoring runs on a local Ollama model.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: input form ── */}
        <div className="panel p-5 space-y-5">
          {/* Sample scenarios */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
              Sample scenarios
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SCENARIOS.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  title={s.description}
                  onClick={() => loadScenario(i)}
                  className={`rounded-md border px-3 py-1.5 text-[13px] transition-colors ${
                    scenarioName === s.name
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-card text-ink hover:border-navy"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <Section title="Address">
            <div>
              <label className={labelCls}>Street</label>
              <input
                className={inputCls}
                value={input.address.street}
                onChange={(e) => patchAddress({ street: e.target.value })}
                placeholder="148 Maplewood Drive"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>City</label>
                <input
                  className={inputCls}
                  value={input.address.city}
                  onChange={(e) => patchAddress({ city: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input
                  className={inputCls}
                  value={input.address.state}
                  onChange={(e) => patchAddress({ state: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>ZIP</label>
                <input
                  className={inputCls}
                  value={input.address.zip}
                  onChange={(e) => patchAddress({ zip: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Country</label>
                <select
                  className={inputCls}
                  value={input.address.country}
                  onChange={(e) => patchAddress({ country: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Address type</label>
                <select
                  className={inputCls}
                  value={input.address.type}
                  onChange={(e) => patchAddress({ type: e.target.value as AddressType })}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="po_box">PO Box</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title="Package">
            <div>
              <label className={labelCls}>
                Weight — <span className="font-mono">{input.order.weight_kg.toFixed(1)} kg</span>
              </label>
              <input
                type="range"
                min={0.1}
                max={50}
                step={0.1}
                value={input.order.weight_kg}
                onChange={(e) => patchOrder({ weight_kg: Number(e.target.value) })}
                className="w-full accent-[#0F2440]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={labelCls}>Declared value (USD)</label>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={input.order.value_usd}
                  onChange={(e) => patchOrder({ value_usd: Number(e.target.value) })}
                />
              </div>
              <Toggle
                label="Fragile"
                checked={input.order.fragile}
                onChange={(v) => patchOrder({ fragile: v })}
              />
            </div>
          </Section>

          <Section title="Delivery">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Carrier</label>
                <select
                  className={inputCls}
                  value={input.order.carrier}
                  onChange={(e) => patchOrder({ carrier: e.target.value })}
                >
                  {CARRIERS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Service level</label>
                <div className="flex gap-3 pt-1.5">
                  {(["standard", "express", "overnight"] as ServiceLevel[]).map((level) => (
                    <label key={level} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="service_level"
                        checked={input.order.service_level === level}
                        onChange={() => patchOrder({ service_level: level })}
                        className="accent-[#0F2440]"
                      />
                      {level}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={labelCls}>Window start</label>
                <input
                  type="date"
                  className={inputCls}
                  value={input.order.delivery_window.start}
                  onChange={(e) =>
                    patchOrder({
                      delivery_window: { ...input.order.delivery_window, start: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Window end</label>
                <input
                  type="date"
                  className={inputCls}
                  value={input.order.delivery_window.end}
                  onChange={(e) =>
                    patchOrder({
                      delivery_window: { ...input.order.delivery_window, end: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <Toggle
              label="Signature required"
              checked={input.order.requires_signature}
              onChange={(v) => patchOrder({ requires_signature: v })}
            />
          </Section>

          <Section title="History (optional)">
            <Toggle
              label="This address has delivery history"
              checked={useHistory}
              onChange={setUseHistory}
            />
            {useHistory && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Previous deliveries</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={history.previous_deliveries}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, previous_deliveries: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Successful</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={history.successful}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, successful: Number(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Avg attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    className={inputCls}
                    value={history.avg_attempts}
                    onChange={(e) =>
                      setHistory((h) => ({ ...h, avg_attempts: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
            )}
          </Section>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleScore}
            className="w-full rounded-lg bg-navy text-white font-medium text-sm py-3 transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {loading ? "Scoring delivery…" : "Score Delivery"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        {/* ── RIGHT: results dashboard ── */}
        <div className="space-y-4">
          {!score && !loading && (
            <div className="panel p-10 text-center">
              <p className="text-sm text-ink-soft">
                Load a sample scenario or fill in the form, then score the
                delivery to see the risk dashboard here.
              </p>
            </div>
          )}

          {loading && (
            <div className="panel p-10 flex items-center justify-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-navy border-t-transparent animate-spin" />
              <p className="text-sm text-ink-soft">Analyzing shipment risk…</p>
            </div>
          )}

          {score && (
            <>
              {/* Gauge over map backdrop */}
              <div className="panel overflow-hidden">
                <div className="map-backdrop flex flex-col items-center py-8 relative">
                  <ConfidenceGauge score={score.confidence} />
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full text-white"
                      style={{ background: RISK_LEVEL_COLOR[score.risk_level] }}
                    >
                      {score.risk_level} risk
                    </span>
                    <span className="text-xs text-ink-soft">
                      est. {score.estimated_attempts.toFixed(1)} delivery attempt
                      {score.estimated_attempts >= 1.5 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk factors grouped by category */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                  Risk factors ({score.risk_factors.length})
                </p>
                {score.risk_factors.length === 0 ? (
                  <div className="panel p-4">
                    <p className="text-sm text-good font-medium">
                      No significant risk factors identified.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupedFactors &&
                      Object.entries(groupedFactors).map(([category, factors]) =>
                        factors?.map((factor, i) => (
                          <RiskCard key={`${category}-${i}`} factor={factor} />
                        ))
                      )}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {score.recommendations.length > 0 && (
                <div className="panel p-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
                    Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {score.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-ink-soft leading-snug flex gap-2">
                        <span className="text-navy font-mono shrink-0">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested actions */}
              {score.suggested_actions.length > 0 && (
                <div className="panel p-4" style={{ borderLeftWidth: 3, borderLeftColor: "var(--good)" }}>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-good mb-2">
                    Suggested actions before shipping
                  </p>
                  <ul className="space-y-1.5">
                    {score.suggested_actions.map((a, i) => (
                      <li key={i} className="text-sm text-ink leading-snug flex gap-2">
                        <span className="text-good shrink-0">✓</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-ink-soft text-center pb-4">
                Heuristic LLM assessment for demonstration — not based on real
                carrier, geocoding, or weather data.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
