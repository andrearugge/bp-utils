import { SpesaRow } from "./types";

const BP_HEADER = ["Data", "Centro costo", "Categoria", "Type", "Direct", "Indirect", "Fornitore", "Descrizione", "Imponibile"];

function escape(value: string): string {
  return value.includes(",") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

export function generateSpeseCsv(rows: SpesaRow[]): string {
  const header = BP_HEADER.map(escape).join(",");
  const lines = rows.map((r) =>
    [r.data, "", "", "", "", "", r.fornitore, r.descrizione, r.imponibile]
      .map(escape)
      .join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

export function downloadSpeseCsv(rows: SpesaRow[], originalFileName: string): void {
  const content = generateSpeseCsv(rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = originalFileName.replace(/\.(xls|xlsx)$/i, "");
  a.download = `${base}_BP.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}
