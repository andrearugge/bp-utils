export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function detectSeparator(headerLine: string): "," | ";" {
  const semiCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  return semiCount >= commaCount && semiCount > 0 ? ";" : ",";
}

export function parseCsv(text: string): ParsedCsv | { error: string } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) return { error: "Il file è vuoto o ha solo l'intestazione." };

  const sep = detectSeparator(lines[0]);
  const headers = parseLine(lines[0], sep);
  const rows = lines.slice(1).map((l) => parseLine(l, sep));

  return { headers, rows };
}
