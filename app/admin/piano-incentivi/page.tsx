"use client";

import { useState, useRef } from "react";
import { Upload, Check, AlertTriangle } from "lucide-react";

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

// Processes a full-year CSV and returns totals + present months for each quarter
function processCSVAllQuarters(text: string, colName: string): QuarterFileData[] {
  const result: QuarterFileData[] = Array.from({ length: 4 }, () => ({ total: 0, months: [] }));
  const monthSets: Set<number>[] = Array.from({ length: 4 }, () => new Set());

  const rows = parseCSV(text);
  if (rows.length < 2) return result;

  const header = rows[0];
  const dateIdx = header.findIndex(h => h.trim() === "Data");
  const amtIdx  = header.findIndex(h => h.trim() === colName);
  if (dateIdx === -1 || amtIdx === -1) return result;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= Math.max(dateIdx, amtIdx)) continue;
    const date = parseItalianDate(row[dateIdx]);
    if (!date) continue;
    const q = quarterOf(date) - 1; // 0-indexed
    if (q < 0 || q > 3) continue;
    result[q].total += parseAmount(row[amtIdx]);
    monthSets[q].add(date.getMonth() + 1); // 1–12
  }

  for (let q = 0; q < 4; q++) {
    result[q].months = Array.from(monthSets[q]).sort((a, b) => a - b);
  }
  return result;
}

// ── formatting ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return "€ " + Math.round(Math.abs(n)).toLocaleString("it-IT");
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ── constants ─────────────────────────────────────────────────────────────────

const QUARTER_LABELS  = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_DATES   = ["Gen – Mar", "Apr – Giu", "Lug – Set", "Ott – Dic"];
const QUARTER_MONTHS  = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]];
const MONTH_SHORT     = ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const TIER = {
  soglia:    { color: "#5DCAA5", bg: "rgba(15,110,86,0.12)",  border: "rgba(93,202,165,0.25)"  },
  target:    { color: "#85B7EB", bg: "rgba(24,95,165,0.12)",  border: "rgba(133,183,235,0.25)" },
  eccellenza:{ color: "#AFA9EC", bg: "rgba(83,74,183,0.12)",  border: "rgba(175,169,236,0.25)" },
};

// ── types ─────────────────────────────────────────────────────────────────────

interface QuarterFileData {
  total: number;
  months: number[]; // months 1–12 present in this quarter
}

interface GlobalCSVData {
  fileName: string;
  perQuarter: QuarterFileData[];
}

interface QData {
  bgt: string;
  bgtEbitdaPct: string;
  act: string;         // manual or auto-filled from CSV
  actEbitdaPct: string;
}

// ── completeness helper ───────────────────────────────────────────────────────

type QuarterStatus = "complete" | "partial" | "empty" | "no-data";

function getQuarterStatus(
  qIdx: number,
  fatture: GlobalCSVData | null,
  acquisti: GlobalCSVData | null,
): { status: QuarterStatus; missing: string[] } {
  // Use fatture as the primary signal; fall back to acquisti only if fatture isn't loaded
  const primary = fatture ?? acquisti;
  if (!primary) return { status: "no-data", missing: [] };

  const present = new Set(primary.perQuarter[qIdx].months);
  const expected = QUARTER_MONTHS[qIdx];
  const missing = expected.filter(m => !present.has(m)).map(m => MONTH_SHORT[m]);

  if (missing.length === 3) return { status: "empty", missing };
  if (missing.length === 0) return { status: "complete", missing: [] };
  return { status: "partial", missing };
}

// ── small UI pieces ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e6e1", margin: "0 0 4px", letterSpacing: "-0.2px" }}>
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "#6b6b70", margin: "0 0 20px" }}>{children}</p>;
}

function Separator() {
  return <div style={{ height: 1, background: "#1a1a1e", margin: "36px 0" }} />;
}

function LabeledInput({ label, value, onChange, suffix, step }: {
  label: string; value: string; onChange: (v: string) => void; suffix?: string; step?: number;
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
          step={step ?? 1}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", background: "#0d0d0f", border: "1px solid #2a2a30",
            borderRadius: 6, color: "#e8e6e1", fontSize: 14, fontWeight: 500,
            padding: "7px 10px", outline: "none", fontFamily: "inherit",
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

function SliderRow({ label, value, onChange, min, max, step, format, color }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; format: (v: number) => string; color: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#9b9b9f" }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color }}>{format(value)}</span>
      </div>
      <input type="range" className="pi-slider" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
    </div>
  );
}

function MultiplierRow({ label, sublabel, value, onChange }: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", background: "#111113", border: "1px solid #1a1a1e", borderRadius: 8,
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#e8e6e1" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#6b6b70", marginTop: 2 }}>{sublabel}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" value={value} min={0} max={5} step={0.05} onChange={e => onChange(e.target.value)}
          style={{
            width: 72, background: "#0d0d0f", border: "1px solid #2a2a30", borderRadius: 6,
            color: "#e8e6e1", fontSize: 14, fontWeight: 600, padding: "6px 10px",
            textAlign: "center", outline: "none", fontFamily: "inherit",
          }}
        />
        <span style={{ fontSize: 12, color: "#6b6b70" }}>×</span>
      </div>
    </div>
  );
}

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
      display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 4, color: s.color, background: s.bg, whiteSpace: "nowrap",
    }}>
      {level}
    </span>
  );
}

// ── status badge on quarter card ──────────────────────────────────────────────

function StatusBadge({ status, missing }: { status: QuarterStatus; missing: string[] }) {
  if (status === "no-data") return null;

  if (status === "complete") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500,
        color: "#5DCAA5", background: "rgba(93,202,165,0.12)",
        border: "1px solid rgba(93,202,165,0.25)", borderRadius: 4, padding: "2px 8px",
      }}>
        <Check size={10} /> Completo
      </span>
    );
  }

  if (status === "empty") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500,
        color: "#6b6b70", background: "rgba(107,107,112,0.1)",
        border: "1px solid #2a2a30", borderRadius: 4, padding: "2px 8px",
      }}>
        Nessun dato
      </span>
    );
  }

  // partial
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500,
      color: "#f59e0b", background: "rgba(245,158,11,0.1)",
      border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 8px",
    }}>
      <AlertTriangle size={10} />
      Manca{missing.length > 1 ? "no" : ""}: {missing.join(", ")}
    </span>
  );
}

// ── global CSV upload section ─────────────────────────────────────────────────

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string || "");
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

function FileUploadButton({
  label, fileName, loaded, loading, inputRef, onFile,
}: {
  label: string;
  fileName: string;
  loaded: boolean;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <input
        type="file"
        accept=".csv"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          background: loaded ? "rgba(93,202,165,0.06)" : "#111113",
          border: `1px solid ${loaded ? "rgba(93,202,165,0.3)" : "#2a2a30"}`,
          borderRadius: 8, color: loaded ? "#5DCAA5" : "#9b9b9f",
          fontSize: 13, cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
          transition: "border-color 0.15s",
        }}
      >
        {loaded
          ? <Check size={14} style={{ flexShrink: 0 }} />
          : <Upload size={14} style={{ flexShrink: 0 }} />}
        <div style={{ textAlign: "left", overflow: "hidden" }}>
          <div style={{ fontWeight: 500 }}>{label}</div>
          {fileName && (
            <div style={{
              fontSize: 11, color: loaded ? "#5DCAA5" : "#6b6b70",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 200,
            }}>
              {fileName}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ── quarter card (no upload buttons, only inputs + status) ────────────────────

function QuarterCard({
  idx, data, onChange, fatture, acquisti,
}: {
  idx: number;
  data: QData;
  onChange: (patch: Partial<QData>) => void;
  fatture: GlobalCSVData | null;
  acquisti: GlobalCSVData | null;
}) {
  const bgtNum = parseFloat(data.bgt) || 0;
  const actNum = parseFloat(data.act) || null;
  const pct    = actNum !== null && bgtNum > 0 ? (actNum / bgtNum) * 100 : null;

  const { status, missing } = getQuarterStatus(idx, fatture, acquisti);

  // CSV-derived sub-totals for info row
  const csvAcq = acquisti?.perQuarter[idx];
  const csvFat = fatture?.perQuarter[idx];
  const hasCsvInfo = csvAcq || csvFat;

  return (
    <div style={{ background: "#111113", border: "1px solid #1a1a1e", borderRadius: 10, padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#e8e6e1" }}>{QUARTER_LABELS[idx]}</span>
        <span style={{ fontSize: 12, color: "#6b6b70" }}>{QUARTER_DATES[idx]} 2026</span>
        {pct !== null && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#f59e0b",
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 4, padding: "2px 8px",
          }}>
            {fmtPct(pct)} vs BGT
          </span>
        )}
        <div style={{ marginLeft: "auto" }}>
          <StatusBadge status={status} missing={missing} />
        </div>
      </div>

      {/* Inputs grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: hasCsvInfo ? 14 : 0 }}>
        <LabeledInput label="BGT Revenue"  value={data.bgt}         onChange={v => onChange({ bgt: v })}         suffix="€" />
        <LabeledInput label="BGT EBITDA %" value={data.bgtEbitdaPct} onChange={v => onChange({ bgtEbitdaPct: v })} suffix="%" step={0.1} />
        <LabeledInput label="ACT Revenue"  value={data.act}         onChange={v => onChange({ act: v })}         suffix="€" />
        <LabeledInput label="ACT EBITDA %" value={data.actEbitdaPct} onChange={v => onChange({ actEbitdaPct: v })} suffix="%" step={0.1} />
      </div>

      {/* CSV sub-totals info row */}
      {hasCsvInfo && (
        <div style={{
          display: "flex", gap: 16, padding: "8px 10px",
          background: "#0d0d0f", borderRadius: 6, fontSize: 11, color: "#6b6b70",
        }}>
          {csvFat && (
            <span>Fatture: <span style={{ color: "#9b9b9f" }}>{fmt(csvFat.total)}</span></span>
          )}
          {csvAcq && (
            <span>Acquisti: <span style={{ color: "#9b9b9f" }}>{fmt(csvAcq.total)}</span></span>
          )}
          {csvFat && csvAcq && (
            <span style={{ marginLeft: "auto" }}>
              ACT auto: <span style={{ color: "#e8e6e1", fontWeight: 600 }}>{fmt(csvFat.total - csvAcq.total)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

const DEFAULT_QUARTERS: QData[] = [
  { bgt: "270000", bgtEbitdaPct: "-5.1", act: "", actEbitdaPct: "" },
  { bgt: "375000", bgtEbitdaPct: "28.1", act: "", actEbitdaPct: "" },
  { bgt: "375000", bgtEbitdaPct: "28.8", act: "", actEbitdaPct: "" },
  { bgt: "375000", bgtEbitdaPct: "24.4", act: "", actEbitdaPct: "" },
];

export default function PianoIncentiviPage() {
  // ── config state ──────────────────────────────────────────────────────────
  const [s1, setS1] = useState(90);
  const [s2, setS2] = useState(100);
  const [s3, setS3] = useState(110);
  const [b1, setB1] = useState(2500);
  const [b2, setB2] = useState(5000);
  const [b3, setB3] = useState(8000);
  const [m1, setM1] = useState("0.75");
  const [m2, setM2] = useState("1.00");
  const [m3, setM3] = useState("1.25");
  const [ebitdaHigh, setEbitdaHigh] = useState("30");

  // ── quarter state ─────────────────────────────────────────────────────────
  const [quarters, setQuarters] = useState<QData[]>(DEFAULT_QUARTERS);

  function updateQuarter(idx: number, patch: Partial<QData>) {
    setQuarters(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  // ── global CSV state ──────────────────────────────────────────────────────
  const [acquistiCSV, setAcquistiCSV] = useState<GlobalCSVData | null>(null);
  const [fattureCSV,  setFattureCSV]  = useState<GlobalCSVData | null>(null);
  const [csvLoading,  setCsvLoading]  = useState(false);

  const acqRef = useRef<HTMLInputElement>(null);
  const fatRef = useRef<HTMLInputElement>(null);

  function autoFillAct(acq: GlobalCSVData, fat: GlobalCSVData) {
    setQuarters(prev => prev.map((q, i) => {
      const fatTotal = fat.perQuarter[i].total;
      const acqTotal = acq.perQuarter[i].total;
      const ebitda   = fatTotal - acqTotal;

      const updates: Partial<QData> = {};
      if (q.act === "" && ebitda !== 0)
        updates.act = Math.round(ebitda).toString();
      if (q.actEbitdaPct === "" && fatTotal !== 0)
        updates.actEbitdaPct = ((ebitda / fatTotal) * 100).toFixed(1);

      return Object.keys(updates).length ? { ...q, ...updates } : q;
    }));
  }

  async function handleAcquistiFile(file: File) {
    setCsvLoading(true);
    try {
      const text = await readFile(file);
      const data: GlobalCSVData = { fileName: file.name, perQuarter: processCSVAllQuarters(text, "Imponibile") };
      setAcquistiCSV(data);
      if (fattureCSV) autoFillAct(data, fattureCSV);
    } finally {
      setCsvLoading(false);
    }
  }

  async function handleFattureFile(file: File) {
    setCsvLoading(true);
    try {
      const text = await readFile(file);
      const data: GlobalCSVData = { fileName: file.name, perQuarter: processCSVAllQuarters(text, "Imponibile") };
      setFattureCSV(data);
      if (acquistiCSV) autoFillAct(acquistiCSV, data);
    } finally {
      setCsvLoading(false);
    }
  }

  // ── compute results ───────────────────────────────────────────────────────
  const mult1 = parseFloat(m1) || 0.75;
  const mult2 = parseFloat(m2) || 1.0;
  const mult3 = parseFloat(m3) || 1.25;
  const highThreshold = parseFloat(ebitdaHigh) || 30;

  const results = quarters.map((q) => {
    const bgt      = parseFloat(q.bgt) || 0;
    const bgtEbitda= parseFloat(q.bgtEbitdaPct) || 0;
    const act      = q.act !== "" ? parseFloat(q.act) : null;
    const actEbitda= q.actEbitdaPct !== "" ? parseFloat(q.actEbitdaPct) : null;

    const thr1 = Math.round(bgt * s1 / 100);
    const thr2 = Math.round(bgt * s2 / 100);
    const thr3 = Math.round(bgt * s3 / 100);

    let level = "—"; let baseBonus = 0;
    if (act !== null && bgt > 0) {
      const pct = act / bgt;
      if      (pct >= s3 / 100) { level = "Eccellenza"; baseBonus = b3; }
      else if (pct >= s2 / 100) { level = "Target";     baseBonus = b2; }
      else if (pct >= s1 / 100) { level = "Soglia";     baseBonus = b1; }
    }

    let mult: number | null = null; let multLabel = "—";
    if (actEbitda !== null && baseBonus > 0) {
      if      (actEbitda >= highThreshold) { mult = mult3; multLabel = `${mult3}×`; }
      else if (actEbitda >= bgtEbitda)     { mult = mult2; multLabel = `${mult2}×`; }
      else                                  { mult = mult1; multLabel = `${mult1}×`; }
    }

    const bonus = mult !== null ? Math.round(baseBonus * mult) : (baseBonus > 0 && actEbitda === null ? baseBonus : 0);
    return { bgt, thr1, thr2, thr3, act, actEbitda, level, multLabel, bonus };
  });

  const totalBonus = results.reduce((s, r) => s + r.bonus, 0);
  const totalLordo = Math.round(totalBonus * 1.35);

  const refBgt = parseFloat(quarters[1].bgt) || 375000;
  const bothLoaded = !!acquistiCSV && !!fattureCSV;

  return (
    <>
      <style>{`
        .pi-slider { -webkit-appearance:none; appearance:none; width:100%; height:4px;
          border-radius:2px; background:#2a2a30; outline:none; cursor:pointer; }
        .pi-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px;
          border-radius:50%; border:2px solid #0a0a0b; background:var(--thumb-color,#f59e0b); cursor:grab; }
        .pi-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%;
          border:2px solid #0a0a0b; background:var(--thumb-color,#f59e0b); cursor:grab; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity:0.4; }
      `}</style>

      <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>

          {/* header */}
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginBottom: 20 }}>
            <SliderRow label="Soglia minima" value={s1} onChange={setS1} min={75}  max={95}  step={5} format={v => v+"%"} color={TIER.soglia.color} />
            <SliderRow label="Target"        value={s2} onChange={setS2} min={95}  max={115} step={5} format={v => v+"%"} color={TIER.target.color} />
            <SliderRow label="Eccellenza"    value={s3} onChange={setS3} min={105} max={135} step={5} format={v => v+"%"} color={TIER.eccellenza.color} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <TierCard label="Soglia"     amount={fmt(refBgt * s1 / 100)} {...TIER.soglia} />
            <TierCard label="Target"     amount={fmt(refBgt * s2 / 100)} {...TIER.target} />
            <TierCard label="Eccellenza" amount={fmt(refBgt * s3 / 100)} {...TIER.eccellenza} />
          </div>
          <p style={{ fontSize: 11, color: "#6b6b70", marginTop: 8 }}>
            Importi calcolati sul budget Q2–Q4 ({fmt(refBgt)}). Q1 ha budget separato.
          </p>

          <Separator />

          {/* ── BONUS PER LIVELLO ── */}
          <SectionTitle>Configurazione bonus per livello</SectionTitle>
          <SectionSubtitle>Importo netto totale del bonus al raggiungimento di ogni soglia</SectionSubtitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            <SliderRow label="Soglia"     value={b1} onChange={setB1} min={500}  max={6000}  step={250} format={fmt} color={TIER.soglia.color} />
            <SliderRow label="Target"     value={b2} onChange={setB2} min={1000} max={10000} step={250} format={fmt} color={TIER.target.color} />
            <SliderRow label="Eccellenza" value={b3} onChange={setB3} min={2000} max={16000} step={250} format={fmt} color={TIER.eccellenza.color} />
          </div>

          <Separator />

          {/* ── MOLTIPLICATORE EBITDA ── */}
          <SectionTitle>Moltiplicatore EBITDA %</SectionTitle>
          <SectionSubtitle>Il bonus base viene corretto in base alla marginalità operativa del trimestre</SectionSubtitle>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <MultiplierRow label="Sotto budget"  sublabel={`EBITDA % < BGT EBITDA %`}                           value={m1} onChange={setM1} />
            <MultiplierRow label="In target"     sublabel={`BGT EBITDA % ≤ EBITDA % < ${ebitdaHigh}%`}          value={m2} onChange={setM2} />
            <MultiplierRow label="Eccellenza"    sublabel={`EBITDA % ≥ soglia alta (${ebitdaHigh}%)`}            value={m3} onChange={setM3} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#6b6b70" }}>Soglia EBITDA eccellenza:</span>
            <input type="number" value={ebitdaHigh} min={0} max={100} step={1}
              onChange={e => setEbitdaHigh(e.target.value)}
              style={{
                width: 64, background: "#0d0d0f", border: "1px solid #2a2a30", borderRadius: 6,
                color: "#e8e6e1", fontSize: 13, fontWeight: 600, padding: "5px 8px",
                textAlign: "center", outline: "none", fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 12, color: "#6b6b70" }}>%</span>
          </div>

          <Separator />

          {/* ── VALUTAZIONE TRIMESTRI ── */}
          <SectionTitle>Valutazione trimestri</SectionTitle>
          <SectionSubtitle>
            Carica i file CSV dell'intero anno — i dati vengono distribuiti automaticamente per trimestre
          </SectionSubtitle>

          {/* Global CSV upload */}
          <div style={{
            background: "#111113", border: "1px solid #1a1a1e", borderRadius: 10,
            padding: "18px 20px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e6e1", marginBottom: 4 }}>
              File CSV annuali
            </div>
            <div style={{ fontSize: 12, color: "#6b6b70", marginBottom: 14 }}>
              Carica una volta sola. Il software filtra i dati per ogni trimestre e indica se mancano mesi.
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <FileUploadButton
                label="Acquisti"
                fileName={acquistiCSV?.fileName ?? ""}
                loaded={!!acquistiCSV}
                loading={csvLoading}
                inputRef={acqRef}
                onFile={handleAcquistiFile}
              />
              <FileUploadButton
                label="Fatture emesse"
                fileName={fattureCSV?.fileName ?? ""}
                loaded={!!fattureCSV}
                loading={csvLoading}
                inputRef={fatRef}
                onFile={handleFattureFile}
              />
            </div>
            {csvLoading && (
              <p style={{ fontSize: 11, color: "#6b6b70", margin: "10px 0 0" }}>Elaborazione in corso…</p>
            )}
            {!bothLoaded && !csvLoading && (acquistiCSV || fattureCSV) && (
              <p style={{ fontSize: 11, color: "#f59e0b", margin: "10px 0 0" }}>
                Carica entrambi i file per calcolare l'ACT automaticamente.
              </p>
            )}
          </div>

          {/* 4 quarter cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {quarters.map((q, i) => (
              <QuarterCard
                key={i}
                idx={i}
                data={q}
                onChange={patch => updateQuarter(i, patch)}
                fatture={fattureCSV}
                acquisti={acquistiCSV}
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
                      textAlign: i === 0 ? "left" : "right", padding: "8px 10px",
                      fontWeight: 500, color: "#6b6b70", borderBottom: "1px solid #1a1a1e", whiteSpace: "nowrap",
                    }}>{h}</th>
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
                    <td style={{ padding: "10px 10px", textAlign: "right" }}><LevelBadge level={r.level} /></td>
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
              marginTop: 16, padding: "12px 16px",
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 8, fontSize: 12, color: "#9b9b9f",
            }}>
              Il costo lordo include la maggiorazione contributiva del 35% applicata ai bonus netti.
            </div>
          )}

        </div>
      </main>
    </>
  );
}
