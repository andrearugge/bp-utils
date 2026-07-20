// Retry con backoff esponenziale per le chiamate all'API Anthropic, condiviso
// tra le route che parlano con Claude (estratto da app/api/extract/route.ts).
// Ritenta su 429 (rate limit) e 529 (overloaded), rispettando l'header
// Retry-After quando presente.

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
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
