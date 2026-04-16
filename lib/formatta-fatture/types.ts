export interface FatturaRow {
  data: string;
  doc: "Fattura" | "Nota di credito";
  num: string;
  cliente: string;
  codice: string;
  nome: string;
  imponibile: string;
  nonImponibile: string;
  iva: string;
  aliquotaIva: string;
  codiceIva: string;
}
