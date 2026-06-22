"use client";

import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";

// ── CSV / number helpers ──────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  if (!raw) return 0;
  const isNeg = raw.includes("-");
  const cleaned = raw.replace(/[^\d,.]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  let val: number;
  if (lastComma !== -1) {
    const intPart = cleaned.slice(0, lastComma).replace(/\./g, "");
    const decPart = cleaned.slice(lastComma + 1);
    val = parseFloat(`${intPart || "0"}.${decPart}`) || 0;
  } else {
    val = parseFloat(cleaned.replace(/\./g, "")) || 0;
  }
  return isNeg ? -val : val;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inQ) { inQ = true; }
    else if (ch === '"' && inQ) {
      if (line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = false; }
    } else if (ch === "," && !inQ) { fields.push(cur); cur = ""; }
    else { cur += ch; }
  }
  fields.push(cur);
  return fields;
}

function parseCSV(text: string): string[][] {
  return text.split(/\r?\n/).filter(l => l.trim()).map(parseCSVLine);
}

function parseItalianDate(str: string): Date | null {
  const p = str.trim().split("/");
  if (p.length !== 3) return null;
  const d = parseInt(p[0]), m = parseInt(p[1]), y = parseInt(p[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m - 1, d);
}

function quarterOf(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

function sumCSVColumn(text: string, quarter: number, colName: string): number {
  const rows = parseCSV(text);
  if (rows.length < 2) return 0;
  const header = rows[0];
  const dateIdx = header.findIndex(h => h.trim() === "Data");
  const amtIdx = header.findIndex(h => h.trim() === colName);
  if (dateIdx === -1 || amtIdx === -1) return 0;
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= Math.max(dateIdx, amtIdx)) continue;
    const date = parseItalianDate(row[dateIdx]);
    if (!date || quarterOf(date) !== quarter) continue;
    total += parseAmount(row[amtIdx]);
  }
  return total;
}

// ── formatting ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "€ " + Math.round(Math.abs(n)).toLocaleString("it-IT");
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ── types ─────────────────────────────────────────────────────────────────────

interface QData {
  bgt: string;
  bgtEbitdaPct: string;
  act: string;
  actEbitdaPct: string;
  acquistiTotal: number | null;
  acquistiFile: string;
  fattureTotal: number | null;
  fattureFile: string;
  loading: boolean;
}

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_DATES = ["Gen – Mar", "Apr – Giu", "Lug – Set", "Ott – Dic"];

// ── tier colors ───────────────────────────────────────────────────────────────

const TIER = {
  soglia: { color: "#5DCAA5", bg: "rgba(15,110,86,0.12)", border: "rgba(93,202,165,0.25)" },
  target: { color: "#85B7EB", bg: "rgba(24,95,165,0.12)", border: "rgba(133,183,235,0.25)" },
  eccellenza: { color: "#AFA9EC", bg: "rgba(83,74,183,0.12)", border: "rgba(175,169,236,0.25)" },
  none: { color: "#6b6b70", bg: "#1a1a1e", border: "#2a2a30" },
};

// ── sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e6e1", margin: "0 0 4px", letterSpacing: "-0.2px" }}>
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, color: "#6b6b70", margin: "0 0 20px" }}>{children}</p>
  );
}

function Separator() {
  return <div style={{ height: 1, background: "#1a1a1e", margin: "36px 0" }} />;
}

function LabeledInput({
  label, value, onChange, suffix, min, max, step,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suffix?: string; min?: number; max?: number; step?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#6b6b70", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%",
            background: "#0d0d0f",
            border: "1px solid #2a2a30",
            borderRadius: 6,
            color: "#e8e6e1",
            fontSize: 14,
            fontWeight: 500,
            padding: "7px 10px",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: "#6b6b70", whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function TierCard({ label, amount, color, bg, border }: {
  label: string; amount: string; color: string; bg: string; border: string;
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{amount}</div>
    </div>
  );
}

function SliderRow({
  label, value, onChange, min, max, step, format, color,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
  format: (v: number) => string; color: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#9b9b9f" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color }}>{format(value)}</span>
      </div>
      <input
        type="range"
        className="pi-slider"
        data-color={color}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
    </div>
  );
}

function MultiplierRow({
  label, sublabel, value, onChange,
}: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      background: "#111113",
      border: "1px solid #1a1a1e",
      borderRadius: 8,
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#e8e6e1" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 2 }}>{sublabel}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          min={0}
          max={5}
          step={0.05}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 72,
            background: "#0d0d0f",
            border: "1px solid #2a2a30",
            borderRadius: 6,
            color: "#e8e6e1",
            fontSize: 14,
            fontWeight: 600,
            padding: "6px 10px",
            textAlign: "center",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <span style={{ fontSize: 12, color: "#6b6b70" }}>×</span>
      </div>
    </div>
  );
}

// ── quarter card ──────────────────────────────────────────────────────────────

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string || "");
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

function QuarterCard({
  idx, data, onChange,
}: {
  idx: number;
  data: QData;
  onChange: (patch: Partial<QData>) => void;
}) {
  const acqRef = useRef<HTMLInputElement>(null);
  const fatRef = useRef<HTMLInputElement>(null);

  const bgtNum = parseFloat(data.bgt) || 0;
  const actNum = parseFloat(data.act) || null;

  async function handleAcquisti(file: File) {
    onChange({ loading: true, acquistiFile: file.name });
    try {
      const text = await readFile(file);
      const total = sumCSVColumn(text, idx + 1, "Imponibile");
      const newAcq = total;
      const fatNum = data.fattureTotal;
      const newAct = fatNum !== null ? fatNum - newAcq : null;
      onChange({
        loading: false,
        acquistiTotal: newAcq,
        ...(newAct !== null ? { act: Math.round(newAct).toString() } : {}),
      });
    } catch {
      onChange({ loading: false, acquistiFile: "Errore lettura file" });
    }
  }

  async function handleFatture(file: File) {
    onChange({ loading: true, fattureFile: file.name });
    try {
      const text = await readFile(file);
      const total = sumCSVColumn(text, idx + 1, "Imponibile");
      const newFat = total;
      const acqNum = data.acquistiTotal;
      const newAct = acqNum !== null ? newFat - acqNum : null;
      onChange({
        loading: false,
        fattureTotal: newFat,
        ...(newAct !== null ? { act: Math.round(newAct).toString() } : {}),
      });
    } catch {
      onChange({ loading: false, fattureFile: "Errore lettura file" });
    }
  }

  const pct = actNum !== null && bgtNum > 0 ? (actNum / bgtNum) * 100 : null;

  return (
    <div style={{
      background: "#111113",
      border: "1px solid #1a1a1e",
      borderRadius: 10,
      padding: "20px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e8e6e1" }}>{QUARTER_LABELS[idx]}</span>
        <span style={{ fontSize: 12, color: "#6b6b70" }}>{QUARTER_DATES[idx]} 2026</span>
        {pct !== null && (
          <span style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 600,
            color: "#f59e0b",
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 4,
            padding: "2px 8px",
          }}>
            {fmtPct(pct)} vs BGT
          </span>
        )}
      </div>

      {/* Grid: 2 columns for inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <LabeledInput label="BGT Revenue" value={data.bgt} onChange={v => onChange({ bgt: v })} suffix="€" />
        <LabeledInput label="BGT EBITDA %" value={data.bgtEbitdaPct} onChange={v => onChange({ bgtEbitdaPct: v })} suffix="%" step={0.1} />
        <LabeledInput label="ACT Revenue" value={data.act} onChange={v => onChange({ act: v })} suffix="€" />
        <LabeledInput label="ACT EBITDA %" value={data.actEbitdaPct} onChange={v => onChange({ actEbitdaPct: v })} suffix="%" step={0.1} />
      </div>

      {/* CSV upload row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {/* Acquisti */}
        <div>
          <input type="file" accept=".csv" ref={acqRef} style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAcquisti(f); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => acqRef.current?.click()}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 10px",
              background: "transparent",
              border: "1px solid #2a2a30",
              borderRadius: 6,
              color: "#9b9b9f",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {data.acquistiTotal !== null
              ? <Check size={13} style={{ color: "#5DCAA5", flexShrink: 0 }} />
              : <Upload size={13} style={{ flexShrink: 0 }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.acquistiFile || "Acquisti CSV"}
            </span>
          </button>
          {data.acquistiTotal !== null && (
            <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 3, paddingLeft: 2 }}>
              Totale: <span style={{ color: "#e8e6e1" }}>{fmt(data.acquistiTotal)}</span>
            </div>
          )}
        </div>

        {/* Fatture */}
        <div>
          <input type="file" accept=".csv" ref={fatRef} style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFatture(f); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fatRef.current?.click()}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 10px",
              background: "transparent",
              border: "1px solid #2a2a30",
              borderRadius: 6,
              color: "#9b9b9f",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {data.fattureTotal !== null
              ? <Check size={13} style={{ color: "#5DCAA5", flexShrink: 0 }} />
              : <Upload size={13} style={{ flexShrink: 0 }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.fattureFile || "Fatture emesse CSV"}
            </span>
          </button>
          {data.fattureTotal !== null && (
            <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 3, paddingLeft: 2 }}>
              Totale: <span style={{ color: "#e8e6e1" }}>{fmt(data.fattureTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {data.loading && (
        <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 8 }}>Calcolo in corso…</div>
      )}
    </div>
  );
}

// ── level badge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    "Eccellenza": { color: "#AFA9EC", bg: "rgba(175,169,236,0.15)" },
    "Target":     { color: "#85B7EB", bg: "rgba(133,183,235,0.15)" },
    "Soglia":     { color: "#5DCAA5", bg: "rgba(93,202,165,0.15)"  },
    "—":          { color: "#6b6b70", bg: "rgba(107,107,112,0.12)" },
  };
  const s = map[level] ?? map["—"];
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 4,
      color: s.color,
      background: s.bg,
      whiteSpace: "nowrap",
    }}>
      {level}
    </span>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

const DEFAULT_QUARTERS: QData[] = [
  { bgt: "270000", bgtEbitdaPct: "-5.1", act: "", actEbitdaPct: "", acquistiTotal: null, acquistiFile: "", fattureTotal: null, fattureFile: "", loading: false },
  { bgt: "375000", bgtEbitdaPct: "28.1", act: "", actEbitdaPct: "", acquistiTotal: null, acquistiFile: "", fattureTotal: null, fattureFile: "", loading: false },
  { bgt: "375000", bgtEbitdaPct: "28.8", act: "", actEbitdaPct: "", acquistiTotal: null, acquistiFile: "", fattureTotal: null, fattureFile: "", loading: false },
  { bgt: "375000", bgtEbitdaPct: "24.4", act: "", actEbitdaPct: "", acquistiTotal: null, acquistiFile: "", fattureTotal: null, fattureFile: "", loading: false },
];

export default function PianoIncentiviPage() {
  // config: soglie %
  const [s1, setS1] = useState(90);
  const [s2, setS2] = useState(100);
  const [s3, setS3] = useState(110);
  // config: bonus €
  const [b1, setB1] = useState(2500);
  const [b2, setB2] = useState(5000);
  const [b3, setB3] = useState(8000);
  // config: moltiplicatori
  const [m1, setM1] = useState("0.75");
  const [m2, setM2] = useState("1.00");
  const [m3, setM3] = useState("1.25");
  const [ebitdaHigh, setEbitdaHigh] = useState("30");

  // quarters
  const [quarters, setQuarters] = useState<QData[]>(DEFAULT_QUARTERS);

  function updateQuarter(idx: number, patch: Partial<QData>) {
    setQuarters(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  // ── compute results ──
  const mult1 = parseFloat(m1) || 0.75;
  const mult2 = parseFloat(m2) || 1.0;
  const mult3 = parseFloat(m3) || 1.25;
  const highThreshold = parseFloat(ebitdaHigh) || 30;

  const results = quarters.map((q) => {
    const bgt = parseFloat(q.bgt) || 0;
    const bgtEbitda = parseFloat(q.bgtEbitdaPct) || 0;
    const act = q.act !== "" ? parseFloat(q.act) : null;
    const actEbitda = q.actEbitdaPct !== "" ? parseFloat(q.actEbitdaPct) : null;

    const thr1 = Math.round(bgt * s1 / 100);
    const thr2 = Math.round(bgt * s2 / 100);
    const thr3 = Math.round(bgt * s3 / 100);

    let level = "—";
    let baseBonus = 0;
    if (act !== null && bgt > 0) {
      const pct = act / bgt;
      if (pct >= s3 / 100) { level = "Eccellenza"; baseBonus = b3; }
      else if (pct >= s2 / 100) { level = "Target"; baseBonus = b2; }
      else if (pct >= s1 / 100) { level = "Soglia"; baseBonus = b1; }
    }

    let mult: number | null = null;
    let multLabel = "—";
    if (actEbitda !== null && baseBonus > 0) {
      if (actEbitda >= highThreshold) { mult = mult3; multLabel = `${mult3}×`; }
      else if (actEbitda >= bgtEbitda) { mult = mult2; multLabel = `${mult2}×`; }
      else { mult = mult1; multLabel = `${mult1}×`; }
    }

    const bonus = mult !== null ? Math.round(baseBonus * mult) : (baseBonus > 0 && actEbitda === null ? baseBonus : 0);

    return { bgt, thr1, thr2, thr3, act, actEbitda, level, multLabel, bonus };
  });

  const totalBonus = results.reduce((s, r) => s + r.bonus, 0);
  const totalLordo = Math.round(totalBonus * 1.35);

  // ── render helpers ──
  const refBgt = parseFloat(quarters[1].bgt) || 375000;

  return (
    <>
      <style>{`
        .pi-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: #2a2a30;
          outline: none;
          cursor: pointer;
        }
        .pi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #0a0a0b;
          background: var(--thumb-color, #f59e0b);
          cursor: grab;
        }
        .pi-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #0a0a0b;
          background: var(--thumb-color, #f59e0b);
          cursor: grab;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.4; }
      `}</style>

      <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* ── header ── */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e6e1", letterSpacing: "-0.3px", margin: 0 }}>
              Piano incentivi soci
            </h1>
            <p style={{ fontSize: 13, color: "#6b6b70", marginTop: 4 }}>
              Beconcept S.r.l. &mdash; Business Plan 2026
            </p>
          </div>

          {/* ── SOGLIE DI FATTURATO ── */}
          <SectionTitle>Configurazione soglie di fatturato</SectionTitle>
          <SectionSubtitle>Percentuali rispetto al budget trimestrale per attivare ogni livello</SectionSubtitle>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 20 }}>
            {/* Soglia */}
            <div>
              <SliderRow
                label="Soglia minima"
                value={s1}
                onChange={setS1}
                min={75} max={95} step={5}
                format={v => v + "%"}
                color={TIER.soglia.color}
              />
            </div>
            {/* Target */}
            <div>
              <SliderRow
                label="Target"
                value={s2}
                onChange={setS2}
                min={95} max={115} step={5}
                format={v => v + "%"}
                color={TIER.target.color}
              />
            </div>
            {/* Eccellenza */}
            <div>
              <SliderRow
                label="Eccellenza"
                value={s3}
                onChange={setS3}
                min={105} max={135} step={5}
                format={v => v + "%"}
                color={TIER.eccellenza.color}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <TierCard label="Soglia" amount={fmt(refBgt * s1 / 100)} {...TIER.soglia} />
            <TierCard label="Target" amount={fmt(refBgt * s2 / 100)} {...TIER.target} />
            <TierCard label="Eccellenza" amount={fmt(refBgt * s3 / 100)} {...TIER.eccellenza} />
          </div>

          <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 8 }}>
            Importi calcolati sul budget Q2–Q4 ({fmt(refBgt)}). Q1 ha budget diverso.
          </div>

          <Separator />

          {/* ── BONUS PER LIVELLO ── */}
          <SectionTitle>Configurazione bonus per livello</SectionTitle>
          <SectionSubtitle>Importo netto totale del bonus al raggiungimento di ogni soglia</SectionSubtitle>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <SliderRow
              label="Soglia"
              value={b1}
              onChange={setB1}
              min={500} max={6000} step={250}
              format={fmt}
              color={TIER.soglia.color}
            />
            <SliderRow
              label="Target"
              value={b2}
              onChange={setB2}
              min={1000} max={10000} step={250}
              format={fmt}
              color={TIER.target.color}
            />
            <SliderRow
              label="Eccellenza"
              value={b3}
              onChange={setB3}
              min={2000} max={16000} step={250}
              format={fmt}
              color={TIER.eccellenza.color}
            />
          </div>

          <Separator />

          {/* ── MOLTIPLICATORE EBITDA ── */}
          <SectionTitle>Moltiplicatore EBITDA %</SectionTitle>
          <SectionSubtitle>Il bonus base viene corretto in base alla marginalità operativa del trimestre</SectionSubtitle>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 12 }}>
            <MultiplierRow
              label="Sotto budget"
              sublabel={`EBITDA % < BGT EBITDA %`}
              value={m1}
              onChange={setM1}
            />
            <MultiplierRow
              label="In target"
              sublabel={`BGT EBITDA % ≤ EBITDA % < ${ebitdaHigh}%`}
              value={m2}
              onChange={setM2}
            />
            <MultiplierRow
              label="Eccellenza"
              sublabel={`EBITDA % ≥ soglia alta`}
              value={m3}
              onChange={setM3}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#6b6b70" }}>Soglia EBITDA eccellenza:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                value={ebitdaHigh}
                min={0}
                max={100}
                step={1}
                onChange={e => setEbitdaHigh(e.target.value)}
                style={{
                  width: 64,
                  background: "#0d0d0f",
                  border: "1px solid #2a2a30",
                  borderRadius: 6,
                  color: "#e8e6e1",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "5px 8px",
                  textAlign: "center",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: 12, color: "#6b6b70" }}>%</span>
            </div>
          </div>

          <Separator />

          {/* ── VALUTAZIONE TRIMESTRI ── */}
          <SectionTitle>Valutazione trimestri</SectionTitle>
          <SectionSubtitle>
            Carica i CSV di acquisti e fatture emesse per calcolare l'ACT, oppure inseriscilo manualmente
          </SectionSubtitle>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {quarters.map((q, i) => (
              <QuarterCard
                key={i}
                idx={i}
                data={q}
                onChange={patch => updateQuarter(i, patch)}
              />
            ))}
          </div>

          <Separator />

          {/* ── TABELLA RISULTATI ── */}
          <SectionTitle>Simulazione trimestrale</SectionTitle>
          <SectionSubtitle>Risultati calcolati dalla configurazione sopra</SectionSubtitle>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["", "BGT", "Soglia", "Target", "Eccellenza", "ACT", "EBITDA %", "Livello", "Mult.", "Bonus netto"].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 0 ? "left" : "right",
                      padding: "8px 10px",
                      fontWeight: 500,
                      color: "#6b6b70",
                      borderBottom: "1px solid #1a1a1e",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #111113" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "#e8e6e1" }}>{QUARTER_LABELS[i]}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#9b9b9f" }}>{fmt(r.bgt)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: TIER.soglia.color }}>{fmt(r.thr1)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: TIER.target.color }}>{fmt(r.thr2)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: TIER.eccellenza.color }}>{fmt(r.thr3)}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#e8e6e1", fontWeight: 500 }}>
                      {r.act !== null ? fmt(r.act) : <span style={{ color: "#6b6b70" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#9b9b9f" }}>
                      {r.actEbitda !== null ? fmtPct(r.actEbitda) : "—"}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>
                      <LevelBadge level={r.level} />
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", color: "#9b9b9f" }}>{r.multLabel}</td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: r.bonus > 0 ? "#f59e0b" : "#6b6b70" }}>
                      {r.bonus > 0 ? fmt(r.bonus) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid #2a2a30" }}>
                  <td colSpan={9} style={{ padding: "10px 10px", color: "#9b9b9f", fontWeight: 500, fontSize: 12 }}>
                    Totale netto annuo
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700, color: "#e8e6e1" }}>
                    {totalBonus > 0 ? fmt(totalBonus) : "—"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={9} style={{ padding: "6px 10px", color: "#6b6b70", fontSize: 12 }}>
                    Costo lordo annuo (×1,35)
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: "#6b6b70", fontSize: 12 }}>
                    {totalLordo > 0 ? fmt(totalLordo) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {totalBonus > 0 && (
            <div style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 8,
              fontSize: 12,
              color: "#9b9b9f",
            }}>
              Il costo lordo include la maggiorazione contributiva del 35% applicata ai bonus netti.
            </div>
          )}

        </div>
      </main>
    </>
  );
}
