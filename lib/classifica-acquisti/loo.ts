// Leave-one-out come modulo runtime (error detection, Fase 4): riusa lo stesso
// core di lookup/voto della Fase 0 (scripts/cross-validate.ts fa l'analogo
// offline per la taratura). Qui l'output non è una statistica aggregata ma
// un Anomalia[] per riga: dove la predizione diverge dai valori sul foglio,
// la riga è un candidato "possibile errore" da rivedere a mano — mai corretta
// in automatico.

import { AcquistoRowTaggata, ASSI, Asse, Anomalia, Classificazione } from "./types";
import { buildLookup, matchRow, MatchOptions, DEFAULT_MATCH_OPTIONS } from "./match";

const ETICHETTE_ASSE: Record<Asse, string> = {
  centroCosto: "Centro costo",
  categoria: "Categoria",
  type: "Type",
  direct: "Direct",
};

function severitaDaEvidenza(consenso: number, occorrenze: number): Anomalia["severita"] {
  if (consenso >= 0.85 && occorrenze >= 3) return "alta";
  if (consenso >= 0.5) return "media";
  return "bassa";
}

/**
 * Per ogni riga di ground truth, predice usando solo le altre righe (leave-one-out)
 * e segnala come "possibile errore" quelle dove la predizione diverge dai valori
 * effettivi sul foglio su almeno un asse. Righe senza storico alternativo (nessun
 * altro fornitore simile) non sono verificabili e vengono saltate.
 */
export function rileviLooMismatch(
  groundTruth: AcquistoRowTaggata[],
  options: MatchOptions = DEFAULT_MATCH_OPTIONS,
): Anomalia[] {
  const lookup = buildLookup(groundTruth);
  const anomalie: Anomalia[] = [];

  for (const row of groundTruth) {
    const match = matchRow(row, lookup, { ...options, escludiRowIndex: row.rowIndex });
    if (match === null) continue;

    const differenze: string[] = [];
    const valoriAttesi: Partial<Classificazione> = {};
    for (const asse of ASSI) {
      if (match.valori[asse] !== row[asse]) {
        differenze.push(`${ETICHETTE_ASSE[asse]}: sul foglio "${row[asse]}", atteso "${match.valori[asse]}"`);
        // Assegnazione per chiave dinamica: `asse` e `match.valori[asse]` sono
        // sempre coerenti a runtime, ma TS non lega l'union della chiave a
        // quella del valore in un mapped type indicizzato dinamicamente.
        valoriAttesi[asse] = match.valori[asse] as never;
      }
    }
    if (differenze.length === 0) continue;

    anomalie.push({
      rowIndex: row.rowIndex,
      tipo: "loo-mismatch",
      motivazione:
        `Leave-one-out (${match.metodo}, ${match.occorrenze} righe storiche, ` +
        `consenso ${(match.consenso * 100).toFixed(0)}%): ${differenze.join("; ")}`,
      severita: severitaDaEvidenza(match.consenso, match.occorrenze),
      valoriAttesi,
    });
  }

  return anomalie;
}
