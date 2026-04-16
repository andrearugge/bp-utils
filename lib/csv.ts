import { InvoiceRecord, AreaFilter } from "./types";

function escape(value: string): string {
  return value.includes(",") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function getImponibileEur(record: InvoiceRecord): string {
  if (record.valuta === "EUR") return record.imponibile;
  return record.imponibile_eur ?? record.imponibile;
}

const BP_HEADER = ["Data", "Centro costo", "Categoria", "Type", "Direct", "Indirect", "Fornitore", "Descrizione", "Imponibile"];

export function generateCsv(records: InvoiceRecord[], filter: AreaFilter): string {
  const filtered = filter === "ALL" ? records : records.filter((r) => r.area === filter);

  const header = BP_HEADER.map(escape).join(",");

  const rows = filtered.map((r) => {
    const imponibileEur = getImponibileEur(r);
    return [r.data, "", "", "", "", "", r.fornitore, r.descrizione, imponibileEur]
      .map(escape)
      .join(",");
  });

  return "\uFEFF" + [header, ...rows].join("\r\n");
}

export function getCsvFilename(filter: AreaFilter): string {
  const date = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (filter === "ALL") return `fatture_${date}.csv`;
  const suffix = filter.toLowerCase().replace("-", "_");
  return `fatture_${suffix}_${date}.csv`;
}

export function downloadCsv(records: InvoiceRecord[], filter: AreaFilter): void {
  const content = generateCsv(records, filter);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getCsvFilename(filter);
  a.click();
  URL.revokeObjectURL(url);
}
