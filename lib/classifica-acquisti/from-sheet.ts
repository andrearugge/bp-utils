// Adatta la lettura generica di una tab (lib/google-sheets/read.ts) al modello
// AcquistoRow, riusando lo stesso parsing campo-per-campo dell'export CSV
// (parseAcquistoFields), così i due percorsi (CSV offline, foglio live) restano
// in sync per costruzione.

import { TabData } from "../google-sheets/read";
import { AcquistoRow } from "./types";
import { AvvisoParse, parseAcquistoFields, RisultatoParse } from "./parse-csv";

export function mapTabToRows(tab: TabData): RisultatoParse {
  const rows: AcquistoRow[] = [];
  const avvisi: AvvisoParse[] = [];

  for (const sheetRow of tab.rows) {
    const { row, avvisi: rowAvvisi } = parseAcquistoFields(sheetRow.values, sheetRow.rowIndex);
    for (const motivo of rowAvvisi) avvisi.push({ rowIndex: sheetRow.rowIndex, motivo });
    if (row) rows.push(row);
  }

  return { rows, avvisi };
}
