"use client";

import { useRef, useState } from "react";
import { loadGis, requestToken } from "@/lib/invia-bp/auth";
import { getTabHeaders, appendRows } from "@/lib/invia-bp/sheets";
import { parseCsv, ParsedCsv } from "@/lib/invia-bp/parse-csv";

type Status = "idle" | "loading" | "ok" | "error";

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600,
        background: done ? "#f59e0b" : active ? "rgba(245,158,11,0.15)" : "#1a1a1e",
        color: done ? "#0a0a0b" : active ? "#f59e0b" : "#6b6b70",
        border: active && !done ? "1px solid #f59e0b" : "1px solid transparent",
        transition: "all 0.2s",
      }}>
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: 13, fontWeight: active || done ? 500 : 400, color: active || done ? "#e8e6e1" : "#6b6b70" }}>
        {label}
      </span>
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, variant = "primary" }: {
  onClick: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; variant?: "primary" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: variant === "primary" ? (disabled || loading ? "#6b6b70" : "#f59e0b") : "transparent",
        border: variant === "ghost" ? "1px solid #2a2a30" : "none",
        borderRadius: 6,
        color: variant === "primary" ? "#0a0a0b" : "#6b6b70",
        fontSize: 13, fontWeight: 600,
        padding: "7px 16px",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled && variant === "ghost" ? 0.4 : 1,
        transition: "background 0.15s",
      }}
    >
      {loading ? "…" : children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        background: "#111114", border: "1px solid #2a2a30", borderRadius: 6,
        color: "#e8e6e1", fontSize: 13, padding: "7px 12px",
        outline: "none", width: "100%", opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

function Notice({ type, children }: { type: "error" | "success" | "info"; children: React.ReactNode }) {
  const colors = {
    error:   { bg: "rgba(220,38,38,0.08)",  border: "rgba(220,38,38,0.2)",  text: "#dc2626" },
    success: { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.2)",  text: "#22c55e" },
    info:    { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", text: "#f59e0b" },
  }[type];
  return (
    <p style={{
      margin: 0, fontSize: 13,
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 6, padding: "10px 14px", color: colors.text,
    }}>
      {children}
    </p>
  );
}

export default function InviaBpPage() {
  // Step 1 — CSV
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [csvName, setCsvName] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Auth
  const [token, setToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<Status>("idle");
  const [authError, setAuthError] = useState<string | null>(null);

  // Step 3 — Sheet ID
  const [sheetId, setSheetId] = useState("");

  // Step 4 — Tab
  const [tabName, setTabName] = useState("");
  const [sendStatus, setSendStatus] = useState<Status>("idle");
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  // ── Step 1: load CSV ──────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Seleziona un file .csv"); return;
    }
    setCsvError(null);
    const text = await file.text();
    const result = parseCsv(text);
    if ("error" in result) { setCsvError(result.error); return; }
    setCsv(result);
    setCsvName(file.name);
    // reset downstream
    setToken(null); setSheetId(""); setTabName("");
    setSendStatus("idle"); setSendMsg(null);
  }

  // ── Step 2: Google login ──────────────────────────────────────────
  async function handleLogin() {
    setAuthStatus("loading"); setAuthError(null);
    try {
      await loadGis();
      const t = await requestToken();
      setToken(t);
      setAuthStatus("ok");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Errore di autenticazione.");
      setAuthStatus("error");
    }
  }

  // ── Step 4: validate + send ───────────────────────────────────────
  async function handleSend() {
    if (!csv || !token || !sheetId.trim() || !tabName.trim()) return;
    setSendStatus("loading"); setSendMsg(null);

    try {
      const sheetHeaders = await getTabHeaders(token, sheetId.trim(), tabName.trim());

      // Validate columns
      const csvHeaders = csv.headers;
      const mismatch = csvHeaders.some((h, i) => h !== sheetHeaders[i]) ||
                       csvHeaders.length !== sheetHeaders.length;

      if (mismatch) {
        const detail = `CSV: [${csvHeaders.join(", ")}] — Sheet: [${sheetHeaders.join(", ")}]`;
        setSendMsg(`Le colonne non corrispondono, dati non importati.\n${detail}`);
        setSendStatus("error");
        return;
      }

      const inserted = await appendRows(token, sheetId.trim(), tabName.trim(), csv.rows);
      setSendMsg(`${inserted} righe aggiunte con successo nella tab "${tabName}".`);
      setSendStatus("ok");
    } catch (err) {
      setSendMsg(err instanceof Error ? err.message : "Errore sconosciuto.");
      setSendStatus("error");
    }
  }

  const step = csv ? (token ? (sheetId.trim() ? 4 : 3) : 2) : 1;

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Header */}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Invio dati a Business Plan</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b6b70" }}>
            Carica un CSV e aggiungilo in append a una tab del tuo Google Sheet.
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Step n={1} label="Carica file CSV"         active={step === 1} done={step > 1} />
          <Step n={2} label="Accedi con Google"        active={step === 2} done={step > 2} />
          <Step n={3} label="ID del foglio Google"     active={step === 3} done={step > 3} />
          <Step n={4} label="Nome tab e invio"         active={step === 4} done={sendStatus === "ok"} />
        </div>

        <div style={{ borderTop: "1px solid #1a1a1e" }} />

        {/* ── Step 1 ── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#9b9ba0" }}>1 · File CSV</p>
          {csv ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111114", border: "1px solid #1a1a1e", borderRadius: 6, padding: "10px 14px" }}>
              <span style={{ fontSize: 13, color: "#e8e6e1" }}>
                {csvName} — <strong>{csv.rows.length}</strong> righe · <strong>{csv.headers.length}</strong> colonne
              </span>
              <button onClick={() => { setCsv(null); setCsvName(""); setToken(null); setSendStatus("idle"); }}
                style={{ background: "none", border: "none", color: "#6b6b70", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                onClick={() => inputRef.current?.click()}
                style={{ border: "2px dashed #2a2a30", borderRadius: 8, padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}
              >
                <span style={{ fontSize: 36, opacity: 0.3, color: "#e8e6e1" }}>↑</span>
                <p style={{ margin: 0, fontSize: 14, color: "#e8e6e1" }}>
                  <span style={{ color: "#f59e0b", fontWeight: 600 }}>Sfoglia</span> o trascina un .csv
                </p>
              </div>
              <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              {csvError && <Notice type="error">{csvError}</Notice>}
            </div>
          )}
        </section>

        {/* ── Step 2 ── */}
        {step >= 2 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#9b9ba0" }}>2 · Account Google</p>
            {token ? (
              <Notice type="success">Autenticato con successo.</Notice>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn onClick={handleLogin} loading={authStatus === "loading"}>
                  Accedi con Google
                </Btn>
                {authError && <Notice type="error">{authError}</Notice>}
              </div>
            )}
          </section>
        )}

        {/* ── Step 3 ── */}
        {step >= 3 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#9b9ba0" }}>3 · ID del foglio Google</p>
            <TextInput
              value={sheetId}
              onChange={setSheetId}
              placeholder="es. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
            <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>
              Puoi trovarlo nell&apos;URL del foglio: docs.google.com/spreadsheets/d/<strong style={{ color: "#9b9ba0" }}>ID</strong>/edit
            </p>
          </section>
        )}

        {/* ── Step 4 ── */}
        {step >= 4 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#9b9ba0" }}>4 · Nome tab</p>
            <TextInput
              value={tabName}
              onChange={(v) => { setTabName(v); setSendStatus("idle"); setSendMsg(null); }}
              placeholder="es. Fatture 2025"
              disabled={sendStatus === "ok"}
            />
            <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>
              Le colonne del CSV devono corrispondere esattamente all&apos;intestazione della tab.
            </p>
            {sendStatus !== "ok" && (
              <Btn
                onClick={handleSend}
                loading={sendStatus === "loading"}
                disabled={!tabName.trim()}
              >
                Valida e invia
              </Btn>
            )}
            {sendMsg && (
              <Notice type={sendStatus === "ok" ? "success" : "error"}>
                {sendMsg.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}
              </Notice>
            )}
            {sendStatus === "ok" && (
              <Btn variant="ghost" onClick={() => { setCsv(null); setCsvName(""); setToken(null); setSheetId(""); setTabName(""); setSendStatus("idle"); setSendMsg(null); }}>
                Nuovo invio
              </Btn>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
