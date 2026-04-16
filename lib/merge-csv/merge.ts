const EXPECTED_HEADER = [
  "Data",
  "Centro costo",
  "Categoria",
  "Type",
  "Direct",
  "Indirect",
  "Fornitore",
  "Descrizione",
  "Imponibile",
];

export interface CsvFile {
  name: string;
  rows: string[]; // raw data lines (no header)
  rowCount: number;
}

export interface ParseFileResult {
  file?: CsvFile;
  error?: string;
}

function normalizeHeader(line: string): string[] {
  // Strip BOM, split by comma, trim quotes and spaces
  return line
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
}

export function parseCsvFile(name: string, text: string): ParseFileResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");

  if (nonEmpty.length === 0) return { error: "File vuoto." };

  const header = normalizeHeader(nonEmpty[0]);
  const mismatch = EXPECTED_HEADER.find((col, i) => header[i] !== col);

  if (header.length !== EXPECTED_HEADER.length || mismatch) {
    return {
      error: `Struttura non valida. Atteso: ${EXPECTED_HEADER.join(", ")}`,
    };
  }

  const rows = nonEmpty.slice(1);
  return { file: { name, rows, rowCount: rows.length } };
}

export function mergeCsvFiles(files: CsvFile[]): string {
  const header = EXPECTED_HEADER.join(",");
  const allRows = files.flatMap((f) => f.rows);
  return "\uFEFF" + [header, ...allRows].join("\r\n");
}
