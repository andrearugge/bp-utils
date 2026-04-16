const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getTabHeaders(
  token: string,
  sheetId: string,
  tabName: string
): Promise<string[]> {
  const range = encodeURIComponent(`${tabName}!1:1`);
  const res = await fetch(`${BASE}/${sheetId}/values/${range}`, {
    headers: authHeader(token),
  });
  if (res.status === 404) throw new Error("Foglio o tab non trovati. Controlla l'ID e il nome della tab.");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Errore API: ${res.status}`);
  }
  const data = await res.json();
  return (data.values?.[0] ?? []) as string[];
}

export async function appendRows(
  token: string,
  sheetId: string,
  tabName: string,
  rows: string[][]
): Promise<number> {
  const range = encodeURIComponent(`${tabName}!A1`);
  const res = await fetch(
    `${BASE}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Errore durante l'invio: ${res.status}`);
  }
  const data = await res.json();
  return data.updates?.updatedRows ?? rows.length;
}
