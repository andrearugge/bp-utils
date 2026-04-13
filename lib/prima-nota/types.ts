export interface PrimaNotaRow {
  /** Indice riga originale nel CSV */
  idx: number;
  /** Campi originali dal CSV */
  data: string;
  rawDesc: string;         // "Descrizione dell'operazione" dal CSV
  importo: string;         // "Importo dare" dal CSV
  sottoconto: string;      // "Descrizione sottoconto" dal CSV
  causale: string;         // "Causale contabile" dal CSV
  /** Campi calcolati */
  azione: "Inserisci" | "Escludi" | "Verifica";
  motivo: string;
  fornitore: string;       // dedotto o vuoto
  descrizione: string;     // pulita
}

export type AzioneFilter = "Tutti" | "Inserisci" | "Escludi" | "Verifica";
