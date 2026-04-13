import { PrimaNotaRow } from "./types";

/** Header del CSV in uscita — formato Business Plan */
const BP_HEADER = ["Data", "Centro costo", "Categoria", "Type", "Direct", "Indirect", "Fornitore", "Descrizione", "Imponibile"];

export function generatePrimaNotaCsv(rows: PrimaNotaRow[], soloInserisci: boolean): string {
  const filtered = soloInserisci ? rows.filter(r => r.azione === "Inserisci") : rows;
  // Separatore: virgola (NON punto e virgola come le fatture)
  // BOM UTF-8 per compatibilità Excel
  const escape = (v: string) => {
    return v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  };
  const header = [
    ...BP_HEADER,
    ...(soloInserisci ? [] : ["Azione"]),
  ].map(escape).join(",");
  const lines = filtered.map(r =>
    [
      r.data, "", "", "", "", "", r.fornitore, r.descrizione, r.importo,
      ...(soloInserisci ? [] : [r.azione]),
    ].map(escape).join(",")
  );
  return "\uFEFF" + [header, ...lines].join("\r\n");
}

export function downloadPrimaNotaCsv(rows: PrimaNotaRow[], soloInserisci: boolean, originalFileName: string): void {
  const content = generatePrimaNotaCsv(rows, soloInserisci);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = originalFileName.replace(/\.csv$/i, "");
  a.download = `${base}_BP${soloInserisci ? "_inserisci" : "_completo"}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}
