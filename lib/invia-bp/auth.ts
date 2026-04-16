const CLIENT_ID = "1007599691007-na9aimvdgl8m5ojfbddg2vr4j3fflmku.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
  }
  interface TokenClient {
    requestAccessToken(): void;
  }
  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }): TokenClient;
}

let gisLoaded = false;

export function loadGis(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Impossibile caricare Google Identity Services."));
    document.head.appendChild(script);
  });
}

export function requestToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}
