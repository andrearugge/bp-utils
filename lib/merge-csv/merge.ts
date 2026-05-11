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

const IMPONIBILE_COL = 8;

export interface CsvFile {
  name: string;
  rows: string[]; // normalized: ; separator, italian decimals
  rowCount: number;
}

export interface ParseFileResult {
  file?: CsvFile;
  error?: string;
}

function detectSeparator(headerLine: string): "," | ";" {
  const stripped = headerLine.replace(/^\uFEFF/, "");
  const semiCount = (stripped.match(/;/g) ?? []).length;
  // Header has 8 separators when well-formed (9 columns)
  return semiCount >= 8 ? ";" : ",";
}

function parseCsvLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === sep) {
        fields.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  fields.push(cur);
  return fields;
}

function escape(v: string): string {
  return v.includes(";") || v.includes('"') || v.includes("\n")
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

function normalizeLegacyRow(rawLine: string): string {
  const fields = parseCsvLine(rawLine, ",");
  if (fields[IMPONIBILE_COL] !== undefined) {
    fields[IMPONIBILE_COL] = fields[IMPONIBILE_COL].replace(".", ",");
  }
  return fields.map(escape).join(";");
}

export function parseCsvFile(name: string, text: string): ParseFileResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim() !== "");

  if (nonEmpty.length === 0) return { error: "File vuoto." };

  const sep = detectSeparator(nonEmpty[0]);
  const header = nonEmpty[0]
    .replace(/^\uFEFF/, "")
    .split(sep)
    .map((h) => h.replace(/^"|"$/g, "").trim());
  const mismatch = EXPECTED_HEADER.find((col, i) => header[i] !== col);

  if (header.length !== EXPECTED_HEADER.length || mismatch) {
    return {
      error: `Struttura non valida. Atteso: ${EXPECTED_HEADER.join(", ")}`,
    };
  }

  const rawRows = nonEmpty.slice(1);
  const rows = sep === ";" ? rawRows : rawRows.map(normalizeLegacyRow);
  return { file: { name, rows, rowCount: rows.length } };
}

export function mergeCsvFiles(files: CsvFile[]): string {
  const header = EXPECTED_HEADER.join(";");
  const allRows = files.flatMap((f) => f.rows);
  return "\uFEFF" + [header, ...allRows].join("\r\n");
}
