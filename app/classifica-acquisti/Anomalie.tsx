"use client";

// Vista "Anomalie" (task 5.4): output della Fase 4 su righe già taggate, con
// azioni correggi / ignora. Ignora scrive nel Classifier Log così l'anomalia
// non viene riproposta ai prossimi caricamenti (letto all'avvio di questa vista).

import { useEffect, useState } from "react";
import { AcquistoRowTaggata, Classificazione, Anomalia, Asse, ASSI, Severita, CENTRI_COSTO, CATEGORIE, TYPES, DIRECT_VALUES } from "@/lib/classifica-acquisti/types";
import { rileviAnomalie } from "@/lib/classifica-acquisti/anomalie";
import { TabData, readTab } from "@/lib/google-sheets/read";
import { batchUpdateCells, CellUpdate } from "@/lib/google-sheets/write";
import { ensureLogTab, appendLogRows } from "@/lib/google-sheets/log";

const LOG_TAB_NAME = "Classifier Log";
const LOG_HEADER = [
  "Timestamp", "Riga", "Fornitore", "Descrizione", "Valori proposti", "Metodo", "Score", "Evidenza", "Esito",
];
const PREFISSO_ANOMALIA = "anomalia:";

interface Props {
  token: string;
  sheetId: string;
  tabName: string;
  tab: TabData;
  groundTruth: AcquistoRowTaggata[];
}

function rigaKey(a: Anomalia): string {
  return `${a.rowIndex}|${a.tipo}`;
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

const ETICHETTE_ASSE: Record<Asse, string> = {
  centroCosto: "Centro costo",
  categoria: "Categoria",
  type: "Type",
  direct: "Direct",
};

/** Assi dove valoriAttesi propone un valore diverso da quello sul foglio. */
function assiModificati(a: Anomalia, row: AcquistoRowTaggata): Asse[] {
  if (!a.valoriAttesi) return [];
  return ASSI.filter((asse) => a.valoriAttesi![asse] !== undefined && a.valoriAttesi![asse] !== row[asse]);
}

function coloreSeverita(s: Severita): string {
  if (s === "alta") return "#dc2626";
  if (s === "media") return "#f59e0b";
  return "#6b6b70";
}

export default function AnomalieView({ token, sheetId, tabName, tab, groundTruth }: Props) {
  const [anomalie, setAnomalie] = useState<Anomalia[]>([]);
  const [ignorate, setIgnorate] = useState<Set<string>>(new Set());
  const [caricamento, setCaricamento] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValori, setEditValori] = useState<Classificazione | null>(null);
  const [azioneMsg, setAzioneMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function carica() {
      setCaricamento(true);
      const tutte = rileviAnomalie(groundTruth);

      const ignorateDalLog = new Set<string>();
      try {
        const log = await readTab(token, sheetId, LOG_TAB_NAME);
        for (const r of log.rows) {
          const esito = r.values["Esito"] ?? "";
          const metodo = r.values["Metodo"] ?? "";
          const riga = r.values["Riga"] ?? "";
          if (esito === "ignorato" && metodo.startsWith(PREFISSO_ANOMALIA)) {
            ignorateDalLog.add(`${riga}|${metodo.slice(PREFISSO_ANOMALIA.length)}`);
          }
        }
      } catch {
        // tab di log non ancora creata: nessuna riga ignorata finora
      }

      if (!cancelled) {
        setAnomalie(tutte);
        setIgnorate(ignorateDalLog);
        setCaricamento(false);
      }
    }

    carica();
    return () => {
      cancelled = true;
    };
  }, [groundTruth, token, sheetId]);

  function rigaByIndex(rowIndex: number): AcquistoRowTaggata | undefined {
    return groundTruth.find((r) => r.rowIndex === rowIndex);
  }

  const visibili = anomalie.filter((a) => !ignorate.has(rigaKey(a)));

  async function logEsito(a: Anomalia, esito: "ignorato" | "corretto", valoriScritti?: Classificazione) {
    await ensureLogTab(token, sheetId, LOG_TAB_NAME, LOG_HEADER);
    const row = rigaByIndex(a.rowIndex);
    await appendLogRows(token, sheetId, LOG_TAB_NAME, [
      [
        new Date().toISOString(),
        String(a.rowIndex),
        row?.fornitore ?? "",
        row?.descrizione ?? "",
        valoriScritti ? JSON.stringify(valoriScritti) : "",
        `${PREFISSO_ANOMALIA}${a.tipo}`,
        "",
        a.motivazione,
        esito,
      ],
    ]);
  }

  async function handleIgnora(a: Anomalia) {
    setAzioneMsg(null);
    try {
      await logEsito(a, "ignorato");
      setIgnorate((prev) => new Set(prev).add(rigaKey(a)));
    } catch (err) {
      setAzioneMsg(err instanceof Error ? err.message : "Errore nella scrittura del log.");
    }
  }

  function handleApriCorreggi(a: Anomalia) {
    const row = rigaByIndex(a.rowIndex);
    if (!row) return;
    setEditKey(rigaKey(a));
    setEditValori({
      centroCosto: a.valoriAttesi?.centroCosto ?? row.centroCosto,
      categoria: a.valoriAttesi?.categoria ?? row.categoria,
      type: a.valoriAttesi?.type ?? row.type,
      direct: a.valoriAttesi?.direct ?? row.direct,
    });
  }

  async function handleSalvaCorrezione(a: Anomalia) {
    if (!editValori) return;
    const ok = window.confirm(`Confermi la correzione della riga ${a.rowIndex} sulla tab "${tabName}"? Scrive sul foglio reale.`);
    if (!ok) return;

    setAzioneMsg(null);
    try {
      const updates: CellUpdate[] = [
        { rowIndex: a.rowIndex, column: "Centro costo", value: editValori.centroCosto },
        { rowIndex: a.rowIndex, column: "Categoria", value: editValori.categoria },
        { rowIndex: a.rowIndex, column: "Type", value: editValori.type },
        { rowIndex: a.rowIndex, column: "Direct", value: `${editValori.direct}%` },
        { rowIndex: a.rowIndex, column: "Tag Source", value: "confirmed" },
      ];
      await batchUpdateCells(token, sheetId, tabName, tab.headers, updates);
      await logEsito(a, "corretto", editValori);
      setIgnorate((prev) => new Set(prev).add(rigaKey(a)));
      setEditKey(null);
      setEditValori(null);
      setAzioneMsg(`Riga ${a.rowIndex} corretta e loggata.`);
    } catch (err) {
      setAzioneMsg(err instanceof Error ? err.message : "Errore di scrittura.");
    }
  }

  if (caricamento) {
    return <p style={{ fontSize: 13, color: "#6b6b70" }}>Analisi in corso…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>
        {visibili.length} anomalie da rivedere ({anomalie.length - visibili.length} già ignorate/corrette).
      </p>
      {azioneMsg && <p style={{ margin: 0, fontSize: 12, color: "#9b9ba0" }}>{azioneMsg}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibili.map((a) => {
          const row = rigaByIndex(a.rowIndex);
          const key = rigaKey(a);
          const inEditing = editKey === key;
          return (
            <div key={key} style={{ border: "1px solid #2a2a30", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{row?.fornitore || row?.descrizione}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b6b70" }}>
                    {row?.data} · riga {a.rowIndex} · {a.tipo}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: coloreSeverita(a.severita), whiteSpace: "nowrap" }}>
                  {a.severita.toUpperCase()}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 12, color: "#e8e6e1" }}>{a.motivazione}</p>
              {row && (
                <p style={{ margin: 0, fontSize: 12, color: "#6b6b70" }}>
                  Sul foglio: {row.centroCosto} · {row.categoria} · {row.type} · Direct {row.direct}%
                </p>
              )}

              {row && assiModificati(a, row).length > 0 && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#f59e0b" }}>Correzione proposta:</p>
                  {assiModificati(a, row).map((asse) => (
                    <p key={asse} style={{ margin: 0, fontSize: 12, color: "#e8e6e1" }}>
                      {ETICHETTE_ASSE[asse]}: <span style={{ color: "#6b6b70" }}>{String(row[asse])}</span>
                      {" → "}
                      <strong>{String(a.valoriAttesi![asse])}{asse === "direct" ? "%" : ""}</strong>
                    </p>
                  ))}
                </div>
              )}

              {inEditing && editValori ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Select value={editValori.centroCosto} onChange={(v) => setEditValori((p) => (p ? { ...p, centroCosto: v as Classificazione["centroCosto"] } : p))} options={CENTRI_COSTO} />
                  <Select value={editValori.categoria} onChange={(v) => setEditValori((p) => (p ? { ...p, categoria: v as Classificazione["categoria"] } : p))} options={CATEGORIE} />
                  <Select value={editValori.type} onChange={(v) => setEditValori((p) => (p ? { ...p, type: v as Classificazione["type"] } : p))} options={TYPES} />
                  <Select value={String(editValori.direct)} onChange={(v) => setEditValori((p) => (p ? { ...p, direct: Number(v) as Classificazione["direct"] } : p))} options={DIRECT_VALUES.map(String)} />
                  <Btn onClick={() => handleSalvaCorrezione(a)}>Salva e scrivi</Btn>
                  <Btn onClick={() => setEditKey(null)} variant="ghost">Annulla</Btn>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={() => handleApriCorreggi(a)}>Correggi</Btn>
                  <Btn onClick={() => handleIgnora(a)} variant="ghost">Ignora</Btn>
                </div>
              )}
            </div>
          );
        })}
        {visibili.length === 0 && <p style={{ fontSize: 13, color: "#6b6b70" }}>Nessuna anomalia da rivedere.</p>}
      </div>
    </div>
  );
}
