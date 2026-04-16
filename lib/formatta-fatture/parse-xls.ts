import * as XLSX from "xlsx";
import { FatturaRow } from "./types";

// Column mapping (0-based: A=0, C=2, F=5, N=13, O=14, R=17, S=18, T=19, U=20, V=21)
const COL = {
  DATA:           0,  // A
  NUM:            2,  // C
  CLIENTE:        5,  // F
  CODICE:        13,  // N
  NOME:          14,  // O
  IMPONIBILE:    17,  // R
  NON_IMPONIBILE:18,  // S
  IVA:           19,  // T
  ALIQUOTA_IVA:  20,  // U
  CODICE_IVA:    21,  // V
} as const;

function findDataStartRow(ws: XLSX.WorkSheet, maxRow: number): number {
  for (let r = 0; r <= Math.min(maxRow, 20); r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: COL.DATA })];
    const val = String(cell?.v ?? "").trim().toLowerCase();
    if (val === "data") return r + 1;
  }
  return 1;
}

function formatDate(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }
  return String(cell.v ?? "");
}

function cellStr(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v == null) return "";
  return String(cell.v).trim();
}

function cellNum(cell: XLSX.CellObject | undefined, negate: boolean): string {
  if (!cell || cell.v == null) return "";
  const n = parseFloat(String(cell.v));
  if (isNaN(n)) return cellStr(cell);
  const result = negate ? -n : n;
  // Keep up to 2 decimal places, strip trailing zeros
  return result % 1 === 0 ? String(result) : result.toFixed(2);
}

export interface ParseXlsResult {
  rows: FatturaRow[];
  error?: string;
}

export function parseXls(
  buffer: ArrayBuffer,
  doc: "Fattura" | "Nota di credito"
): ParseXlsResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { rows: [], error: "Impossibile leggere il file XLS." };
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: "Nessun foglio trovato." };

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const dataStart = findDataStartRow(ws, range.e.r);
  const negate = doc === "Nota di credito";

  const rows: FatturaRow[] = [];

  for (let r = dataStart; r <= range.e.r; r++) {
    const get = (col: number) => ws[XLSX.utils.encode_cell({ r, c: col })];

    // Skip rows without a date or number
    const numVal = cellStr(get(COL.NUM));
    if (!numVal) continue;

    rows.push({
      data:           formatDate(get(COL.DATA)),
      doc,
      num:            numVal,
      cliente:        cellStr(get(COL.CLIENTE)),
      codice:         cellStr(get(COL.CODICE)),
      nome:           cellStr(get(COL.NOME)),
      imponibile:     cellNum(get(COL.IMPONIBILE), negate),
      nonImponibile:  cellNum(get(COL.NON_IMPONIBILE), negate),
      iva:            cellNum(get(COL.IVA), negate),
      aliquotaIva:    cellStr(get(COL.ALIQUOTA_IVA)),
      codiceIva:      cellStr(get(COL.CODICE_IVA)),
    });
  }

  if (rows.length === 0) return { rows: [], error: "Nessuna riga trovata." };
  return { rows };
}
