// Aggregazione runtime delle metriche di accuratezza (Fase 5, vista "Metriche"):
// leave-one-out per asse e copertura per metodo, sullo stesso principio di
// scripts/cross-validate.ts ma come funzione di libreria richiamabile dalla UI
// su qualunque ground truth caricato dal foglio (non solo dal CSV di riferimento).

import { AcquistoRow, AcquistoRowTaggata, Asse, ASSI, TagSource } from "./types";
import { buildLookup, matchRow, MatchOptions, DEFAULT_MATCH_OPTIONS } from "./match";

export interface AccuratezzaAsse {
  corretti: number;
  totale: number;
}

export interface MetricheLoo {
  righeTotali: number;
  righeConMatch: number;
  senzaMatch: number;
  perMetodo: Record<string, number>;
  perAsse: Record<Asse, AccuratezzaAsse>;
  righeCompletamenteCorrette: number;
}

/** Leave-one-out sul ground truth: predice ogni riga usando solo le altre. */
export function calcolaMetricheLoo(
  groundTruth: AcquistoRowTaggata[],
  matchOptions: MatchOptions = DEFAULT_MATCH_OPTIONS,
): MetricheLoo {
  const lookup = buildLookup(groundTruth);
  const perAsse: Record<Asse, AccuratezzaAsse> = {
    centroCosto: { corretti: 0, totale: 0 },
    categoria: { corretti: 0, totale: 0 },
    type: { corretti: 0, totale: 0 },
    direct: { corretti: 0, totale: 0 },
  };
  const perMetodo: Record<string, number> = {};
  let senzaMatch = 0;
  let righeCompletamenteCorrette = 0;

  for (const row of groundTruth) {
    const match = matchRow(row, lookup, { ...matchOptions, escludiRowIndex: row.rowIndex });
    if (match === null) {
      senzaMatch++;
      continue;
    }
    perMetodo[match.metodo] = (perMetodo[match.metodo] ?? 0) + 1;

    let tutteCorrette = true;
    for (const asse of ASSI) {
      perAsse[asse].totale++;
      if (match.valori[asse] === row[asse]) perAsse[asse].corretti++;
      else tutteCorrette = false;
    }
    if (tutteCorrette) righeCompletamenteCorrette++;
  }

  return {
    righeTotali: groundTruth.length,
    righeConMatch: groundTruth.length - senzaMatch,
    senzaMatch,
    perMetodo,
    perAsse,
    righeCompletamenteCorrette,
  };
}

/** Conteggio righe per valore di Tag Source (incluse le righe senza valore). */
export function conteggioPerTagSource(rows: AcquistoRow[]): Record<string, number> {
  const conteggio: Record<string, number> = {};
  for (const r of rows) {
    const k: TagSource | "(vuoto)" = r.tagSource ?? "(vuoto)";
    conteggio[k] = (conteggio[k] ?? 0) + 1;
  }
  return conteggio;
}
