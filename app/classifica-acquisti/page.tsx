"use client";

// Scaffold della UI di revisione (task 5.1): auth Google + caricamento tab,
// stato in memoria (mai persistito). Riusa il pattern a step di invia-bp.
// Le viste "Da classificare" / "Anomalie" / "Metriche" arrivano nei task
// successivi (5.2, 5.4, 5.5) come componenti separati.

import { useMemo, useState } from "react";
import { loadGis, requestToken } from "@/lib/google-sheets/auth";
import { readTab, TabData } from "@/lib/google-sheets/read";
import { mapTabToRows } from "@/lib/classifica-acquisti/from-sheet";
import { AcquistoRow, isRowTaggata } from "@/lib/classifica-acquisti/types";
import { selectGroundTruth } from "@/lib/classifica-acquisti/ground-truth";
import { buildLookup } from "@/lib/classifica-acquisti/match";
import { VIEWS, ViewName } from "./shared";

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#6b6b70" : "#f59e0b",
        border: "none", borderRadius: 6, color: "#0a0a0b",
        fontSize: 13, fontWeight: 600, padding: "7px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
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

export default function ClassificaAcquistiPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [sheetId, setSheetId] = useState("");
  const [tabName, setTabName] = useState("Acquisti - ACT");
  const [tab, setTab] = useState<TabData | null>(null);
  const [rows, setRows] = useState<AcquistoRow[]>([]);
  const [avvisiParse, setAvvisiParse] = useState<string[]>([]);
  const [loadMsg, setLoadMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<ViewName>("da-classificare");

  const groundTruth = useMemo(() => selectGroundTruth(rows), [rows]);
  const lookup = useMemo(() => buildLookup(groundTruth), [groundTruth]);
  const daClassificare = useMemo(() => rows.filter((r) => !isRowTaggata(r)), [rows]);

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

  async function handleCarica() {
    if (!token || !sheetId.trim() || !tabName.trim()) return;
    setLoading(true);
    setLoadMsg(null);
    try {
      const data = await readTab(token, sheetId.trim(), tabName.trim());
      const { rows: parsedRows, avvisi } = mapTabToRows(data);
      setTab(data);
      setRows(parsedRows);
      setAvvisiParse(avvisi.map((a) => `riga ${a.rowIndex}: ${a.motivo}`));
      setLoadMsg(`Caricate ${parsedRows.length} righe (${avvisi.length} avvisi di parsing).`);
    } catch (err) {
      setLoadMsg(err instanceof Error ? err.message : "Errore di caricamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Classificazione Acquisti — ACT</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b6b70" }}>
            Nessuna scrittura sul foglio senza conferma esplicita. La colonna Indirect non viene mai toccata.
          </p>
        </div>

        {!tab ? (
          <section style={{ display: "flex", flexDirection: "column", gap: 14, border: "1px solid #2a2a30", borderRadius: 8, padding: 16, maxWidth: 480 }}>
            <Btn onClick={handleLogin} disabled={!!token}>{token ? "Autenticato" : "Accedi con Google"}</Btn>
            {authMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{authMsg}</p>}

            <Field label="ID foglio" value={sheetId} onChange={setSheetId} placeholder="ID del Google Sheet" />
            <Field label="Nome tab" value={tabName} onChange={setTabName} />
            <Btn onClick={handleCarica} disabled={!token || !sheetId.trim() || !tabName.trim() || loading}>
              {loading ? "Caricamento…" : "Carica tab"}
            </Btn>
            {loadMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{loadMsg}</p>}
          </section>
        ) : (
          <>
            <section style={{ display: "flex", gap: 16, fontSize: 12, color: "#9b9ba0" }}>
              <span><strong style={{ color: "#e8e6e1" }}>{rows.length}</strong> righe totali</span>
              <span><strong style={{ color: "#e8e6e1" }}>{groundTruth.length}</strong> ground truth</span>
              <span><strong style={{ color: "#e8e6e1" }}>{daClassificare.length}</strong> da classificare</span>
              {avvisiParse.length > 0 && <span>{avvisiParse.length} avvisi di parsing</span>}
            </section>

            <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid #1a1a1e" }}>
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  style={{
                    background: "none", border: "none", borderBottom: view === v.id ? "2px solid #f59e0b" : "2px solid transparent",
                    color: view === v.id ? "#e8e6e1" : "#6b6b70", fontSize: 13, fontWeight: 600,
                    padding: "8px 14px", cursor: "pointer",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </nav>

            <section>
              {view === "da-classificare" && (
                <p style={{ fontSize: 13, color: "#6b6b70" }}>
                  Vista in arrivo (task 5.2): {daClassificare.length} righe non taggate, lookup pronto ({lookup.size} chiavi storiche).
                </p>
              )}
              {view === "anomalie" && (
                <p style={{ fontSize: 13, color: "#6b6b70" }}>Vista in arrivo (task 5.4).</p>
              )}
              {view === "metriche" && (
                <p style={{ fontSize: 13, color: "#6b6b70" }}>Vista in arrivo (task 5.5).</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
