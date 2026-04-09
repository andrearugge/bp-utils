export interface InvoiceRecord {
  id: string;
  data: string;              // DD/MM/YYYY
  fornitore: string;
  descrizione: string;
  imponibile: string;        // "120.00"
  valuta: string;            // "EUR", "USD", "GBP", etc.
  numero_fattura: string;
  paese: string;             // Codice ISO 2 lettere: "US", "IT", "DE", etc.
  area: "ITALIA" | "INTRA-UE" | "EXTRA-UE";
  tasso_cambio: number | null;
  imponibile_eur: string | null;  // "46.00" oppure null se EUR
  file: string;              // nome file originale
  extracted_at: string;      // data/ora estrazione in formato italiano
  status: "ok" | "error";
  error?: string;            // solo se status === "error"
}

export type AreaFilter = "ALL" | "EXTRA-UE" | "INTRA-UE" | "ITALIA";
