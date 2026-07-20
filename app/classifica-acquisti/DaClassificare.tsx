"use client";

// Vista "Da classificare" (task 5.2): righe non taggate con suggerimento,
// confidence, metodo ed evidenza; azioni accetta/modifica/scarta e selezione
// multipla per l'accettazione in blocco delle confidence alte. La scrittura
// effettiva sul foglio (task 5.3) è in fondo a questo stesso file: le due cose
// sono la stessa vista, solo task numerati separatamente nel piano.

import { useEffect, useState } from "react";
import {
  AcquistoRow,
  Classificazione,
  MetodoClassificazione,
  Suggerimento,
  CENTRI_COSTO,
  CATEGORIE,
  TYPES,
  DIRECT_VALUES,
} from "@/lib/classifica-acquisti/types";
import { Lookup, matchRow, topFuzzyMatches } from "@/lib/classifica-acquisti/match";
import { buildSuggerimento } from "@/lib/classifica-acquisti/confidence";
import { TabData } from "@/lib/google-sheets/read";
import { batchUpdateCells, CellUpdate } from "@/lib/google-sheets/write";
import { ensureLogTab, appendLogRows } from "@/lib/google-sheets/log";

const LOG_TAB_NAME = "Classifier Log";
const LOG_HEADER = [
  "Timestamp", "Riga", "Fornitore", "Descrizione", "Valori proposti", "Metodo", "Score", "Evidenza", "Esito",
];

/** Riga finalizzata dall'utente, in attesa di scrittura sul foglio. */
interface RigaClassificata {
  rowIndex: number;
  valori: Classificazione;
  /** auto = accettato senza modifica, confirmed = rivisto/modificato a mano. */
  esito: "auto" | "confirmed";
  metodo: MetodoClassificazione | "manuale";
  score: number;
  evidenza: string;
}

interface Props {
  token: string;
  sheetId: string;
  tabName: string;
  tab: TabData;
  /** Righe non taggate della tab corrente. */
  rows: AcquistoRow[];
  lookup: Lookup;
}

function Btn({ onClick, disabled, children, variant = "primary" }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; variant?: "primary" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: variant === "ghost" ? "transparent" : disabled ? "#6b6b70" : "#f59e0b",
        border: variant === "ghost" ? "1px solid #2a2a30" : "none",
        borderRadius: 6, color: variant === "ghost" ? "#9b9ba0" : "#0a0a0b",
        fontSize: 12, fontWeight: 600, padding: "6px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "#111114", border: "1px solid #2a2a30", borderRadius: 6, color: "#e8e6e1", fontSize: 12, padding: "5px 8px" }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function coloreLivello(livello: string): string {
  if (livello === "alta") return "#22c55e";
  if (livello === "media") return "#f59e0b";
  return "#dc2626";
}

export default function DaClassificare({ token, sheetId, tabName, tab, rows, lookup }: Props) {
  const [suggerimenti, setSuggerimenti] = useState<Map<number, Suggerimento | null>>(new Map());
  const [coda, setCoda] = useState<Map<number, RigaClassificata>>(new Map());
  const [selezionate, setSelezionate] = useState<Set<number>>(new Set());
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editValori, setEditValori] = useState<Classificazione | null>(null);
  const [llmMsg, setLlmMsg] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [writeMsg, setWriteMsg] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    const m = new Map<number, Suggerimento | null>();
    for (const row of rows) {
      const match = matchRow(row, lookup);
      m.set(row.rowIndex, match ? buildSuggerimento(row, match) : null);
    }
    setSuggerimenti(m);
    setCoda(new Map());
    setSelezionate(new Set());
  }, [rows, lookup]);

  const righeVisibili = rows.filter((r) => !coda.has(r.rowIndex));
  const senzaSuggerimento = righeVisibili.filter((r) => suggerimenti.get(r.rowIndex) == null);

  function rigaByIndex(rowIndex: number): AcquistoRow | undefined {
    return rows.find((r) => r.rowIndex === rowIndex);
  }

  async function handleRichiediLlm() {
    if (senzaSuggerimento.length === 0) return;
    setLlmLoading(true);
    setLlmMsg(null);
    try {
      const payload = {
        rows: senzaSuggerimento.map((r) => ({
          rowIndex: r.rowIndex,
          data: r.data,
          fornitore: r.fornitore,
          descrizione: r.descrizione,
          imponibile: r.imponibile,
          topMatches: topFuzzyMatches(r, lookup),
        })),
      };
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Errore ${res.status}`);

      setSuggerimenti((prev) => {
        const next = new Map(prev);
        for (const r of data.risultati as { rowIndex: number; valori: Classificazione; motivazione: string }[]) {
          next.set(r.rowIndex, {
            rowIndex: r.rowIndex,
            valori: r.valori,
            score: 0.3,
            livello: "bassa",
            metodo: "llm",
            evidenza: r.motivazione,
            similarita: 0,
            occorrenze: 0,
          });
        }
        return next;
      });
      setLlmMsg(`Suggerimenti LLM ricevuti per ${data.risultati.length} righe.`);
    } catch (err) {
      setLlmMsg(err instanceof Error ? err.message : "Errore nella richiesta LLM.");
    } finally {
      setLlmLoading(false);
    }
  }

  function stageRiga(
    rowIndex: number,
    valori: Classificazione,
    esito: "auto" | "confirmed",
    metodo: MetodoClassificazione | "manuale",
    score: number,
    evidenza: string,
  ) {
    setCoda((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, { rowIndex, valori, esito, metodo, score, evidenza });
      return next;
    });
    setSelezionate((prev) => {
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
  }

  function handleAccetta(rowIndex: number) {
    const s = suggerimenti.get(rowIndex);
    if (!s) return;
    stageRiga(rowIndex, s.valori, "auto", s.metodo, s.score, s.evidenza);
  }

  function handleScarta(rowIndex: number) {
    setSelezionate((prev) => {
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
    if (editRowIndex === rowIndex) setEditRowIndex(null);
  }

  function handleApriModifica(rowIndex: number) {
    const s = suggerimenti.get(rowIndex);
    setEditRowIndex(rowIndex);
    setEditValori(
      s?.valori ?? { centroCosto: CENTRI_COSTO[0], categoria: CATEGORIE[0], type: TYPES[0], direct: DIRECT_VALUES[0] },
    );
  }

  function handleSalvaModifica() {
    if (editRowIndex == null || !editValori) return;
    stageRiga(editRowIndex, editValori, "confirmed", "manuale", 1, "Valori impostati manualmente in revisione");
    setEditRowIndex(null);
    setEditValori(null);
  }

  function handleAccettaSelezionate() {
    for (const rowIndex of selezionate) {
      const s = suggerimenti.get(rowIndex);
      if (s?.livello === "alta") stageRiga(rowIndex, s.valori, "auto", s.metodo, s.score, s.evidenza);
    }
  }

  function toggleSelezione(rowIndex: number) {
    setSelezionate((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  async function handleScriviConferme() {
    const voci = [...coda.values()];
    if (voci.length === 0) return;
    const ok = window.confirm(
      `Confermi la scrittura di ${voci.length} righe sulla tab "${tabName}"? È un'operazione sul foglio reale.`,
    );
    if (!ok) return;

    setWriting(true);
    setWriteMsg(null);
    try {
      const updates: CellUpdate[] = [];
      for (const v of voci) {
        updates.push(
          { rowIndex: v.rowIndex, column: "Centro costo", value: v.valori.centroCosto },
          { rowIndex: v.rowIndex, column: "Categoria", value: v.valori.categoria },
          { rowIndex: v.rowIndex, column: "Type", value: v.valori.type },
          { rowIndex: v.rowIndex, column: "Direct", value: `${v.valori.direct}%` },
          { rowIndex: v.rowIndex, column: "Tag Source", value: v.esito },
        );
      }
      const n = await batchUpdateCells(token, sheetId, tabName, tab.headers, updates);

      await ensureLogTab(token, sheetId, LOG_TAB_NAME, LOG_HEADER);
      const timestamp = new Date().toISOString();
      const logRows = voci.map((v) => {
        const row = rigaByIndex(v.rowIndex);
        return [
          timestamp,
          String(v.rowIndex),
          row?.fornitore ?? "",
          row?.descrizione ?? "",
          JSON.stringify(v.valori),
          v.metodo,
          v.score.toFixed(2),
          v.evidenza,
          v.esito,
        ];
      });
      await appendLogRows(token, sheetId, LOG_TAB_NAME, logRows);

      setWriteMsg(`${n} celle scritte, ${logRows.length} righe di log accodate.`);
      setCoda(new Map());
    } catch (err) {
      setWriteMsg(err instanceof Error ? err.message : "Errore di scrittura.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Btn onClick={handleRichiediLlm} disabled={senzaSuggerimento.length === 0 || llmLoading}>
          {llmLoading ? "Richiesta in corso…" : `Richiedi suggerimenti LLM (${senzaSuggerimento.length})`}
        </Btn>
        <Btn onClick={handleAccettaSelezionate} disabled={selezionate.size === 0} variant="ghost">
          Accetta selezionate ({selezionate.size})
        </Btn>
        <Btn onClick={handleScriviConferme} disabled={coda.size === 0 || writing}>
          {writing ? "Scrittura…" : `Scrivi ${coda.size} conferme sul foglio`}
        </Btn>
        {coda.size > 0 && <span style={{ fontSize: 12, color: "#6b6b70" }}>{coda.size} in coda</span>}
      </div>
      {llmMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{llmMsg}</p>}
      {writeMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{writeMsg}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {righeVisibili.map((row) => {
          const s = suggerimenti.get(row.rowIndex);
          const inEditing = editRowIndex === row.rowIndex;
          return (
            <div key={row.rowIndex} style={{ border: "1px solid #2a2a30", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  {s?.livello === "alta" && (
                    <input
                      type="checkbox"
                      checked={selezionate.has(row.rowIndex)}
                      onChange={() => toggleSelezione(row.rowIndex)}
                      style={{ marginTop: 3 }}
                    />
                  )}
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{row.fornitore || row.descrizione}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b6b70" }}>
                      {row.data} · € {row.imponibile.toFixed(2)} · riga {row.rowIndex}
                    </p>
                  </div>
                </div>
                {s && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: coloreLivello(s.livello), whiteSpace: "nowrap" }}>
                    {s.livello.toUpperCase()} · {s.metodo}
                  </span>
                )}
              </div>

              {s ? (
                <>
                  <p style={{ margin: 0, fontSize: 12, color: "#e8e6e1" }}>
                    {s.valori.centroCosto} · {s.valori.categoria} · {s.valori.type} · Direct {s.valori.direct}%
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>{s.evidenza}</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>
                  Nessun suggerimento storico — richiedi il fallback LLM oppure modifica manualmente.
                </p>
              )}

              {inEditing && editValori ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Select
                    value={editValori.centroCosto}
                    onChange={(v) => setEditValori((p) => (p ? { ...p, centroCosto: v as Classificazione["centroCosto"] } : p))}
                    options={CENTRI_COSTO}
                  />
                  <Select
                    value={editValori.categoria}
                    onChange={(v) => setEditValori((p) => (p ? { ...p, categoria: v as Classificazione["categoria"] } : p))}
                    options={CATEGORIE}
                  />
                  <Select
                    value={editValori.type}
                    onChange={(v) => setEditValori((p) => (p ? { ...p, type: v as Classificazione["type"] } : p))}
                    options={TYPES}
                  />
                  <Select
                    value={String(editValori.direct)}
                    onChange={(v) => setEditValori((p) => (p ? { ...p, direct: Number(v) as Classificazione["direct"] } : p))}
                    options={DIRECT_VALUES.map(String)}
                  />
                  <Btn onClick={handleSalvaModifica}>Salva</Btn>
                  <Btn onClick={() => setEditRowIndex(null)} variant="ghost">Annulla</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => handleAccetta(row.rowIndex)} disabled={!s}>Accetta</Btn>
                  <Btn onClick={() => handleApriModifica(row.rowIndex)} variant="ghost">Modifica</Btn>
                  <Btn onClick={() => handleScarta(row.rowIndex)} variant="ghost">Scarta</Btn>
                </div>
              )}
            </div>
          );
        })}
        {righeVisibili.length === 0 && (
          <p style={{ fontSize: 13, color: "#6b6b70" }}>Nessuna riga da classificare al momento.</p>
        )}
      </div>
    </div>
  );
}
