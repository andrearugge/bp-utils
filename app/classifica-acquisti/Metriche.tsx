"use client";

// Vista "Metriche" (task 5.5): accuratezza LOO per asse, copertura per metodo,
// n. righe per Tag Source. Sola lettura, nessuna scrittura sul foglio.

import { useMemo } from "react";
import { AcquistoRow, AcquistoRowTaggata, Asse } from "@/lib/classifica-acquisti/types";
import { calcolaMetricheLoo, conteggioPerTagSource } from "@/lib/classifica-acquisti/metriche";

const ETICHETTE_ASSE: Record<Asse, string> = {
  centroCosto: "Centro costo",
  categoria: "Categoria",
  type: "Type",
  direct: "Direct",
};

interface Props {
  rows: AcquistoRow[];
  groundTruth: AcquistoRowTaggata[];
}

function Barra({ pct }: { pct: number }) {
  return (
    <div style={{ background: "#1a1a1e", borderRadius: 4, height: 6, width: 120, overflow: "hidden" }}>
      <div style={{ background: pct >= 95 ? "#22c55e" : pct >= 85 ? "#f59e0b" : "#dc2626", height: "100%", width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function Metriche({ rows, groundTruth }: Props) {
  const loo = useMemo(() => calcolaMetricheLoo(groundTruth), [groundTruth]);
  const perTagSource = useMemo(() => conteggioPerTagSource(rows), [rows]);

  const righeCorretePct = loo.righeConMatch > 0 ? (loo.righeCompletamenteCorrette / loo.righeConMatch) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
      <section>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#9b9ba0" }}>Accuratezza LOO per asse</h2>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b6b70" }}>
          Su {loo.righeConMatch}/{loo.righeTotali} righe con match storico ({loo.senzaMatch} senza storico utile).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(Object.keys(ETICHETTE_ASSE) as Asse[]).map((asse) => {
            const a = loo.perAsse[asse];
            const pct = a.totale > 0 ? (a.corretti / a.totale) * 100 : 0;
            return (
              <div key={asse} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                <span style={{ width: 100, color: "#e8e6e1" }}>{ETICHETTE_ASSE[asse]}</span>
                <Barra pct={pct} />
                <span style={{ color: "#9b9ba0", width: 90, textAlign: "right" }}>
                  {pct.toFixed(1)}% ({a.corretti}/{a.totale})
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, marginTop: 4, paddingTop: 8, borderTop: "1px solid #1a1a1e" }}>
            <span style={{ width: 100, color: "#e8e6e1", fontWeight: 600 }}>Riga intera</span>
            <Barra pct={righeCorretePct} />
            <span style={{ color: "#9b9ba0", width: 90, textAlign: "right" }}>
              {righeCorretePct.toFixed(1)}% ({loo.righeCompletamenteCorrette}/{loo.righeConMatch})
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#9b9ba0" }}>Copertura per metodo</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          {Object.entries(loo.perMetodo).map(([metodo, n]) => (
            <div key={metodo} style={{ display: "flex", justifyContent: "space-between", color: "#e8e6e1" }}>
              <span>{metodo}</span>
              <span style={{ color: "#9b9ba0" }}>{n}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6b6b70" }}>
            <span>senza match (→ LLM)</span>
            <span>{loo.senzaMatch}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#9b9ba0" }}>Righe per Tag Source</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          {Object.entries(perTagSource).map(([tag, n]) => (
            <div key={tag} style={{ display: "flex", justifyContent: "space-between", color: "#e8e6e1" }}>
              <span>{tag}</span>
              <span style={{ color: "#9b9ba0" }}>{n}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
