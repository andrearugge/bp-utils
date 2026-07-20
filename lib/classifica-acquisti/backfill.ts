// Piano di backfill una-tantum della colonna Tag Source: righe taggate fino al
// cutoff (mag 2026) senza Tag Source già impostato → "manual". È solo un piano
// (nessuna scrittura): il chiamante lo presenta all'utente e scrive solo dopo
// conferma esplicita (vincolo fisso del progetto).
//
// I colori della colonna A dello script vecchio NON sono un segnale affidabile
// (vengono puliti alla validazione manuale): il cutoff su Tag Source + data è
// l'unico criterio.

import { AcquistoRow, isRowTaggata, ASSI } from "./types";

export interface RigaDaImpostare {
  rowIndex: number;
  tagSource: "manual";
}

export interface RigaDaSegnalare {
  rowIndex: number;
  motivo: string;
}

export interface PianoBackfill {
  daImpostare: RigaDaImpostare[];
  /** Righe entro il cutoff con dati incoerenti: da mostrare all'utente, mai da inventare. */
  daSegnalare: RigaDaSegnalare[];
  /** Righe già con un Tag Source (backfill idempotente: non toccate). */
  giaImpostate: number;
  /** Righe dopo il cutoff, fuori dallo scope di questo backfill una-tantum. */
  fuoriCutoff: number;
}

/**
 * Calcola il piano di backfill. `cutoffISO` è la data limite inclusa
 * (es. "2026-05-31" per "taggato fino a maggio 2026 = manuale").
 */
export function pianificaBackfillTagSource(rows: AcquistoRow[], cutoffISO: string): PianoBackfill {
  const daImpostare: RigaDaImpostare[] = [];
  const daSegnalare: RigaDaSegnalare[] = [];
  let giaImpostate = 0;
  let fuoriCutoff = 0;

  for (const row of rows) {
    if (row.tagSource !== null) {
      giaImpostate++;
      continue;
    }
    if (row.dataISO > cutoffISO) {
      fuoriCutoff++;
      continue;
    }
    if (isRowTaggata(row)) {
      daImpostare.push({ rowIndex: row.rowIndex, tagSource: "manual" });
      continue;
    }
    const assiValorizzati = ASSI.filter((a) => row[a] !== null).length;
    const motivo =
      assiValorizzati === 0
        ? "riga entro il cutoff ma senza alcun tag"
        : `taggata solo parzialmente (${assiValorizzati}/4 assi) entro il cutoff`;
    daSegnalare.push({ rowIndex: row.rowIndex, motivo });
  }

  return { daImpostare, daSegnalare, giaImpostate, fuoriCutoff };
}
