import { NextRequest, NextResponse } from "next/server";
import { EXTRACTION_PROMPT } from "@/lib/prompt";
import { fetchWithRetry } from "@/lib/anthropic/fetch-with-retry";

export const maxDuration = 60;

const MODEL = "claude-sonnet-5";

const EXTRACT_TOOL = {
  name: "extract_invoice",
  description: "Registra i dati estratti da una fattura o ricevuta.",
  input_schema: {
    type: "object",
    properties: {
      data: { type: "string", description: "Data fattura in formato DD/MM/YYYY, o N/D" },
      fornitore: { type: "string" },
      descrizione: { type: "string", description: "Max 80 caratteri" },
      imponibile: { type: "string", description: "Numero con 2 decimali, senza simbolo valuta, es. 80.00" },
      valuta: { type: "string", description: "Codice valuta ISO, es. EUR, USD, GBP" },
      numero_fattura: { type: "string" },
      paese: { type: "string", description: "Codice ISO a 2 lettere del paese del fornitore" },
      area: { type: "string", enum: ["ITALIA", "INTRA-UE", "EXTRA-UE"] },
      tasso_cambio: { anyOf: [{ type: "number" }, { type: "null" }] },
      imponibile_eur: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: [
      "data", "fornitore", "descrizione", "imponibile", "valuta",
      "numero_fattura", "paese", "area", "tasso_cambio", "imponibile_eur",
    ],
    additionalProperties: false,
  },
  strict: true,
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key non configurata" }, { status: 500 });
  }

  let body: { base64: string; mediaType: string; isPdf: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body non valido" }, { status: 400 });
  }

  const { base64, mediaType, isPdf } = body;
  if (!base64 || !mediaType) {
    return NextResponse.json({ error: "Campi base64 e mediaType obbligatori" }, { status: 400 });
  }

  const contentBlock = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      };

  const anthropicBody = JSON.stringify({
    model: MODEL,
    max_tokens: 1000,
    system: [{ type: "text", text: EXTRACTION_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_invoice" },
    messages: [
      {
        role: "user",
        content: [contentBlock],
      },
    ],
  });

  const anthropicHeaders = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "pdfs-2024-09-25",
    "Content-Type": "application/json",
  };

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: anthropicBody,
    });
  } catch (err) {
    return NextResponse.json({ error: `Errore di rete: ${String(err)}` }, { status: 500 });
  }

  if (!anthropicResponse.ok) {
    const errorText = await anthropicResponse.text();
    return NextResponse.json(
      { error: `Anthropic API error ${anthropicResponse.status}: ${errorText}` },
      { status: anthropicResponse.status >= 500 ? 502 : 400 }
    );
  }

  const result = await anthropicResponse.json();

  if (result.stop_reason === "refusal") {
    return NextResponse.json({ error: "Richiesta rifiutata dal modello" }, { status: 502 });
  }

  const toolUse = (result.content ?? []).find(
    (block: { type: string }) => block.type === "tool_use"
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: "Nessuna tool_use nella risposta del modello" },
      { status: 502 }
    );
  }

  const responseHeaders: Record<string, string> = {};
  for (const key of [
    "anthropic-ratelimit-requests-limit",
    "anthropic-ratelimit-requests-remaining",
    "anthropic-ratelimit-requests-reset",
    "anthropic-ratelimit-tokens-limit",
    "anthropic-ratelimit-tokens-remaining",
    "anthropic-ratelimit-tokens-reset",
  ]) {
    const val = anthropicResponse.headers.get(key);
    if (val) responseHeaders[key] = val;
  }

  return NextResponse.json(toolUse.input, { headers: responseHeaders });
}
