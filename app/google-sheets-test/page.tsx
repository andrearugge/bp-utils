"use client";

// Pagina di verifica manuale (task 1.5): read → write cella → log, contro un
// Google Sheet di test. Non è UI definitiva del prodotto — serve solo a
// confermare a mano che il layer lib/google-sheets funzioni end-to-end prima
// di costruirci sopra la Fase 5. Ogni scrittura richiede conferma esplicita
// (window.confirm) e mai tocca la colonna Indirect.

import { useState } from "react";
import { loadGis, requestToken } from "@/lib/google-sheets/auth";
import { readTab, TabData } from "@/lib/google-sheets/read";
import { batchUpdateCells } from "@/lib/google-sheets/write";
import { ensureLogTab, appendLogRows } from "@/lib/google-sheets/log";

const LOG_HEADER = ["Timestamp", "Riga", "Nota"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, border: "1px solid #2a2a30", borderRadius: 8, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#9b9ba0" }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#9b9ba0" }}>
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: "#111114", border: "1px solid #2a2a30", borderRadius: 6, color: "#e8e6e1", fontSize: 13, padding: "6px 10px" }}
      />
    </label>
  );
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#6b6b70" : "#f59e0b",
        border: "none", borderRadius: 6, color: "#0a0a0b",
        fontSize: 13, fontWeight: 600, padding: "7px 16px",
        cursor: disabled ? "not-allowed" : "pointer", alignSelf: "flex-start",
      }}
    >
      {children}
    </button>
  );
}

export default function GoogleSheetsTestPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [sheetId, setSheetId] = useState("");
  const [tabName, setTabName] = useState("");
  const [tab, setTab] = useState<TabData | null>(null);
  const [readMsg, setReadMsg] = useState<string | null>(null);

  const [rowIndex, setRowIndex] = useState("");
  const [column, setColumn] = useState("");
  const [value, setValue] = useState("");
  const [writeMsg, setWriteMsg] = useState<string | null>(null);

  const [logTabName, setLogTabName] = useState("Classifier Log");
  const [logNota, setLogNota] = useState("verifica manuale task 1.5");
  const [logMsg, setLogMsg] = useState<string | null>(null);

  async function handleLogin() {
    setAuthMsg(null);
    try {
      await loadGis();
      const t = await requestToken();
      setToken(t);
      setAuthMsg("Autenticato.");
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : "Errore di autenticazione.");
    }
  }

  async function handleRead() {
    if (!token || !sheetId.trim() || !tabName.trim()) return;
    setReadMsg(null);
    try {
      const data = await readTab(token, sheetId.trim(), tabName.trim());
      setTab(data);
      setReadMsg(`Lette ${data.rows.length} righe, ${data.headers.length} colonne: [${data.headers.join(", ")}]`);
    } catch (err) {
      setReadMsg(err instanceof Error ? err.message : "Errore di lettura.");
    }
  }

  async function handleWrite() {
    if (!token || !tab || !sheetId.trim() || !tabName.trim()) return;
    const r = Number(rowIndex);
    if (!Number.isInteger(r) || r < 2) {
      setWriteMsg("Numero riga non valido (deve essere ≥ 2, l'header è la riga 1).");
      return;
    }
    if (!window.confirm(`Confermi la scrittura di "${value}" in ${column} riga ${r} sulla tab "${tabName}"?`)) return;

    setWriteMsg(null);
    try {
      const n = await batchUpdateCells(token, sheetId.trim(), tabName.trim(), tab.headers, [
        { rowIndex: r, column, value },
      ]);
      setWriteMsg(`${n} cella scritta con successo.`);
    } catch (err) {
      setWriteMsg(err instanceof Error ? err.message : "Errore di scrittura.");
    }
  }

  async function handleLog() {
    if (!token || !sheetId.trim() || !logTabName.trim()) return;
    if (!window.confirm(`Confermi: crea (se assente) la tab "${logTabName}" e accoda una riga di log?`)) return;

    setLogMsg(null);
    try {
      await ensureLogTab(token, sheetId.trim(), logTabName.trim(), LOG_HEADER);
      const timestamp = new Date().toISOString();
      const n = await appendLogRows(token, sheetId.trim(), logTabName.trim(), [
        [timestamp, `${tabName.trim()}!riga ${rowIndex || "?"}`, logNota],
      ]);
      setLogMsg(`Tab pronta, ${n} riga di log accodata.`);
    } catch (err) {
      setLogMsg(err instanceof Error ? err.message : "Errore sul log.");
    }
  }

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Verifica manuale — lib/google-sheets</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b6b70" }}>
            Pagina di test (task 1.5): read → write cella → log su un foglio di test.
            Ogni scrittura chiede conferma esplicita. La colonna Indirect è bloccata dal layer di scrittura.
          </p>
        </div>

        <Section title="1 · Login Google">
          <Btn onClick={handleLogin} disabled={!!token}>{token ? "Autenticato" : "Accedi con Google"}</Btn>
          {authMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{authMsg}</p>}
        </Section>

        <Section title="2 · Lettura tab (readTab)">
          <Field label="ID foglio" value={sheetId} onChange={setSheetId} placeholder="ID del Google Sheet di test" />
          <Field label="Nome tab" value={tabName} onChange={setTabName} placeholder="es. Acquisti - ACT" />
          <Btn onClick={handleRead} disabled={!token || !sheetId.trim() || !tabName.trim()}>Leggi tab</Btn>
          {readMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0", whiteSpace: "pre-wrap" }}>{readMsg}</p>}
        </Section>

        <Section title="3 · Scrittura cella (batchUpdateCells)">
          <Field label="Numero riga (header = 1)" value={rowIndex} onChange={setRowIndex} placeholder="es. 5" />
          <Field label="Colonna (nome esatto dell'header)" value={column} onChange={setColumn} placeholder="es. Centro costo" />
          <Field label="Valore" value={value} onChange={setValue} placeholder="es. BLT" />
          <Btn onClick={handleWrite} disabled={!token || !tab || !rowIndex.trim() || !column.trim()}>Scrivi cella</Btn>
          {writeMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0", whiteSpace: "pre-wrap" }}>{writeMsg}</p>}
        </Section>

        <Section title="4 · Classifier Log (ensureLogTab + appendLogRows)">
          <Field label="Nome tab di log" value={logTabName} onChange={setLogTabName} />
          <Field label="Nota" value={logNota} onChange={setLogNota} />
          <Btn onClick={handleLog} disabled={!token || !sheetId.trim() || !logTabName.trim()}>Crea/aggiorna log</Btn>
          {logMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0", whiteSpace: "pre-wrap" }}>{logMsg}</p>}
        </Section>
      </div>
    </main>
  );
}
