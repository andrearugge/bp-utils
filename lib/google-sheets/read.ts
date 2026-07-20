// Lettura di una tab intera, con mapping header→campi per nome colonna (non per
// posizione): l'ordine delle colonne sul foglio può cambiare (es. inserimento
// della colonna Tag Source) senza rompere chi consuma i dati.

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export interface SheetRow {
  /** Numero riga sul foglio (header = 1, prima riga dati = 2). */
  rowIndex: number;
  /** Valori della riga indicizzati per nome colonna. Colonna assente/vuota → "". */
  values: Record<string, string>;
}

export interface TabData {
  headers: string[];
  rows: SheetRow[];
}

async function handleError(res: Response): Promise<never> {
  if (res.status === 404) throw new Error("Foglio o tab non trovati. Controlla l'ID e il nome della tab.");
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error?.message ?? `Errore API Google Sheets: ${res.status}`);
}

/**
 * Legge l'intera tab: prima riga come header, righe successive mappate per
 * nome di colonna. `values.get` con il solo nome tab restituisce l'intervallo
 * effettivamente popolato, senza bisogno di conoscerne in anticipo l'estensione.
 */
export async function readTab(token: string, sheetId: string, tabName: string): Promise<TabData> {
  const range = encodeURIComponent(tabName);
  const res = await fetch(`${BASE}/${sheetId}/values/${range}`, {
    headers: authHeader(token),
  });
  if (!res.ok) await handleError(res);

  const data = await res.json();
  const values: string[][] = data.values ?? [];
  const headers = (values[0] ?? []).map((h) => h.trim());

  const rows: SheetRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const record = values[i];
    const rowValues: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowValues[h] = record[idx] ?? "";
    });
    rows.push({ rowIndex: i + 1, values: rowValues });
  }

  return { headers, rows };
}
