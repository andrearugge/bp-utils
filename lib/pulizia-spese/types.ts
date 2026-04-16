export interface SpesaRow {
  idx: number;
  data: string;       // DD/MM/YYYY
  fornitore: string;
  descrizione: string;
  imponibile: string; // numeric string, e.g. "70.55"
}
