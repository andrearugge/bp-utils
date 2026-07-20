"use client";

// Backfill una-tantum della colonna Tag Source (task 2.2): righe taggate fino
// al cutoff (mag 2026) → "manual". Pagina usa-e-getta: legge il foglio reale,
// mostra il piano (dry run) e scrive solo dopo conferma esplicita. Le righe
// anomale (Direct vuoto, riga di maggio non taggata) vengono solo segnalate,
// mai indovinate (task 2.3).

import { useState } from "react";
import { loadGis, requestToken } from "@/lib/google-sheets/auth";
import { readTab, TabData } from "@/lib/google-sheets/read";
import { batchUpdateCells } from "@/lib/google-sheets/write";
import { mapTabToRows } from "@/lib/classifica-acquisti/from-sheet";
import { pianificaBackfillTagSource, PianoBackfill } from "@/lib/classifica-acquisti/backfill";

const CUTOFF_ISO = "2026-05-31";
const CUTOFF_LABEL = "31/05/2026";

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

export default function BackfillTagSourcePage() {
  const [token, setToken] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [sheetId, setSheetId] = useState("");
  const [tabName, setTabName] = useState("Acquisti - ACT");
  const [tab, setTab] = useState<TabData | null>(null);
  const [piano, setPiano] = useState<PianoBackfill | null>(null);
  const [avvisi, setAvvisi] = useState<string[]>([]);
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  const [writeMsg, setWriteMsg] = useState<string | null>(null);
  const [scritto, setScritto] = useState(false);

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

  async function handleCalcolaPiano() {
    if (!token || !sheetId.trim() || !tabName.trim()) return;
    setPlanMsg(null);
    setPiano(null);
    setScritto(false);
    setWriteMsg(null);
    try {
      const data = await readTab(token, sheetId.trim(), tabName.trim());
      if (!data.headers.includes("Tag Source")) {
        setPlanMsg('Colonna "Tag Source" non trovata sulla tab: verifica di aver aggiunto la colonna prima del backfill.');
        return;
      }
      setTab(data);
      const { rows, avvisi: parseAvvisi } = mapTabToRows(data);
      setAvvisi(parseAvvisi.map((a) => `riga ${a.rowIndex}: ${a.motivo}`));
      setPiano(pianificaBackfillTagSource(rows, CUTOFF_ISO));
      setPlanMsg(`Piano calcolato su ${rows.length} righe lette.`);
    } catch (err) {
      setPlanMsg(err instanceof Error ? err.message : "Errore nel calcolo del piano.");
    }
  }

  async function handleScrivi() {
    if (!token || !tab || !piano || !sheetId.trim() || !tabName.trim()) return;
    if (piano.daImpostare.length === 0) return;

    const ok = window.confirm(
      `Confermi la scrittura di Tag Source = "manual" su ${piano.daImpostare.length} righe della tab "${tabName}"? ` +
        `Questa è un'operazione una-tantum sul foglio reale.`,
    );
    if (!ok) return;

    setWriteMsg(null);
    try {
      const n = await batchUpdateCells(
        token,
        sheetId.trim(),
        tabName.trim(),
        tab.headers,
        piano.daImpostare.map((r) => ({ rowIndex: r.rowIndex, column: "Tag Source", value: r.tagSource })),
      );
      setWriteMsg(`${n} celle scritte con successo.`);
      setScritto(true);
    } catch (err) {
      setWriteMsg(err instanceof Error ? err.message : "Errore di scrittura.");
    }
  }

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Backfill Tag Source — una tantum</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b6b70" }}>
            Righe taggate fino al {CUTOFF_LABEL} → Tag Source = &quot;manual&quot;. Non tocca righe già impostate,
            non tocca righe dopo il cutoff, non inventa valori sulle righe anomale (segnalate sotto).
          </p>
        </div>

        <Section title="1 · Login Google">
          <Btn onClick={handleLogin} disabled={!!token}>{token ? "Autenticato" : "Accedi con Google"}</Btn>
          {authMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{authMsg}</p>}
        </Section>

        <Section title="2 · Calcola piano (dry run, nessuna scrittura)">
          <Field label="ID foglio" value={sheetId} onChange={setSheetId} placeholder="ID del Google Sheet reale" />
          <Field label="Nome tab" value={tabName} onChange={setTabName} />
          <Btn onClick={handleCalcolaPiano} disabled={!token || !sheetId.trim() || !tabName.trim()}>
            Leggi e calcola piano
          </Btn>
          {planMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{planMsg}</p>}
        </Section>

        {piano && (
          <Section title="3 · Piano">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
              <li><strong>{piano.daImpostare.length}</strong> righe → Tag Source = &quot;manual&quot;</li>
              <li>{piano.giaImpostate} righe già con Tag Source, non toccate</li>
              <li>{piano.fuoriCutoff} righe dopo il cutoff, fuori scope</li>
              <li style={{ color: piano.daSegnalare.length > 0 ? "#f59e0b" : undefined }}>
                {piano.daSegnalare.length} righe anomale, da rivedere a mano
              </li>
            </ul>

            {piano.daSegnalare.length > 0 && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "10px 14px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>Righe da rivedere manualmente:</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#e8e6e1" }}>
                  {piano.daSegnalare.map((r) => (
                    <li key={r.rowIndex}>riga {r.rowIndex}: {r.motivo}</li>
                  ))}
                </ul>
              </div>
            )}

            {avvisi.length > 0 && (
              <details>
                <summary style={{ fontSize: 12, color: "#6b6b70", cursor: "pointer" }}>
                  {avvisi.length} avvisi di parsing
                </summary>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#6b6b70" }}>
                  {avvisi.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </details>
            )}

            <Btn onClick={handleScrivi} disabled={piano.daImpostare.length === 0 || scritto}>
              {scritto ? "Scritto" : `Scrivi Tag Source su ${piano.daImpostare.length} righe`}
            </Btn>
            {writeMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{writeMsg}</p>}
          </Section>
        )}
      </div>
    </main>
  );
}
