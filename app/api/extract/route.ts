import { NextRequest, NextResponse } from "next/server";
import { EXTRACTION_PROMPT } from "@/lib/prompt";

export const maxDuration = 60;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Use Retry-After header from the previous response if available, else exponential backoff
      let delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
      const retryAfter = lastResponse?.headers.get("retry-after");
      if (retryAfter) {
        const fromHeader = parseFloat(retryAfter) * 1000;
        if (fromHeader > 0 && fromHeader < 60000) delay = fromHeader;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      lastResponse = null;
      continue;
    }

    if (response.status === 429 || response.status === 529) {
      lastResponse = response;
      continue;
    }

    return response;
  }

  return lastResponse!;
}

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
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
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
  const text: string = result?.content?.[0]?.text ?? "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: `Risposta non parsabile: ${text.slice(0, 200)}` },
      { status: 500 }
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

  return NextResponse.json(parsed, { headers: responseHeaders });
}
