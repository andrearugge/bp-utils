import * as XLSX from "xlsx";
import { SpesaRow } from "./types";

// FattureInCloud export layout:
//   rows 0-3 → metadata/empty
//   row  4   → headers: Data(0), Fornitore(7), Descrizione(16), Imponibile(18)
//   rows 5+  → data

const COL = { DATA: 0, FORNITORE: 7, DESCRIZIONE: 16, IMPONIBILE: 18 } as const;

function formatDate(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  // With cellDates:true the .v value is a JS Date
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  // Fallback: already a string
  return String(cell.v ?? "");
}

function cellStr(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return "";
  return String(cell.v).trim();
}

export interface ParseResult {
  rows: SpesaRow[];
  error?: string;
}

export function parseXls(buffer: ArrayBuffer): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { rows: [], error: "Impossibile leggere il file XLS." };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: "Nessun foglio trovato nel file." };

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const DATA_START_ROW = 5; // 0-indexed row 5 = first data row

  const rows: SpesaRow[] = [];
  let idx = 0;

  for (let r = DATA_START_ROW; r <= range.e.r; r++) {
    const getCell = (col: number) =>
      ws[XLSX.utils.encode_cell({ r, c: col })];

    const imponibileCell = getCell(COL.IMPONIBILE);
    const imponibileRaw = cellStr(imponibileCell);
    // Skip empty rows
    if (!imponibileRaw) continue;

    rows.push({
      idx: idx++,
      data: formatDate(getCell(COL.DATA)),
      fornitore: cellStr(getCell(COL.FORNITORE)),
      descrizione: cellStr(getCell(COL.DESCRIZIONE)),
      imponibile: imponibileRaw,
    });
  }

  if (rows.length === 0) return { rows: [], error: "Nessuna riga trovata nel file." };
  return { rows };
}
