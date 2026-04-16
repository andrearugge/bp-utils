import { FatturaRow } from "./types";

const HEADER = [
  "Data", "Doc", "Num", "Cliente", "Codice", "Nome",
  "Imponibile", "Non imponibile", "IVA", "Aliquota IVA", "Codice IVA",
];

function escape(v: string): string {
  return v.includes(",") || v.includes('"') || v.includes("\n")
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

export function generateCsv(rows: FatturaRow[]): string {
  const header = HEADER.map(escape).join(",");
  const lines = rows.map((r) =>
    [
      r.data, r.doc, r.num, r.cliente, r.codice, r.nome,
      r.imponibile, r.nonImponibile, r.iva, r.aliquotaIva, r.codiceIva,
    ].map(escape).join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

export function downloadCsv(rows: FatturaRow[]): void {
  const content = generateCsv(rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fatture_ndc.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}
