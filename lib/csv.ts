import { InvoiceRecord, AreaFilter } from "./types";

function toItalianDecimal(value: string): string {
  return value.replace(".", ",");
}

function escapeField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function getImponibileEur(record: InvoiceRecord): string {
  if (record.valuta === "EUR") return record.imponibile;
  return record.imponibile_eur ?? record.imponibile;
}

export function generateCsv(records: InvoiceRecord[], filter: AreaFilter): string {
  const filtered = filter === "ALL" ? records : records.filter((r) => r.area === filter);

  const header = [
    "Data",
    "Fornitore",
    "N. Fattura",
    "Descrizione",
    "Paese",
    "Area",
    "Imponibile Originale",
    "Valuta",
    "Imponibile EUR",
    "Tasso Cambio",
    "File",
    "Estratto Il",
  ]
    .map(escapeField)
    .join(";");

  const rows = filtered.map((r) => {
    const imponibileEur = getImponibileEur(r);
    const tassoCambio = r.tasso_cambio != null ? String(r.tasso_cambio) : "";

    return [
      r.data,
      r.fornitore,
      r.numero_fattura,
      r.descrizione,
      r.paese,
      r.area,
      toItalianDecimal(r.imponibile),
      r.valuta,
      toItalianDecimal(imponibileEur),
      toItalianDecimal(tassoCambio),
      r.file,
      r.extracted_at,
    ]
      .map(escapeField)
      .join(";");
  });

  return "\uFEFF" + [header, ...rows].join("\n");
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
