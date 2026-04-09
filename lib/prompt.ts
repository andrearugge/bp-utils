export const EXTRACTION_PROMPT = `Sei un assistente specializzato nell'estrazione dati da fatture e ricevute.
Analizza questo documento (fattura o ricevuta) ed estrai ESATTAMENTE questi campi:
- data: la data della fattura in formato DD/MM/YYYY
- fornitore: il nome dell'azienda/fornitore che ha emesso la fattura
- descrizione: una breve descrizione dei beni/servizi fatturati (max 80 caratteri)
- imponibile: l'importo imponibile (senza IVA se separata, altrimenti il totale). Solo il numero con 2 decimali, senza simbolo valuta.
- valuta: il codice valuta (EUR, USD, GBP, etc.)
- numero_fattura: il numero della fattura se presente, altrimenti "N/D"
- paese: il codice ISO a 2 lettere del paese del fornitore (es. "US", "DE", "IE", "IL", "IT"). Deducilo dall'indirizzo, partita IVA, o ragione sociale presenti nel documento.
- area: classificazione fiscale. Usa "ITALIA" se il fornitore è italiano, "INTRA-UE" se il fornitore ha sede in un paese UE (esclusa Italia), "EXTRA-UE" se ha sede fuori dall'Unione Europea. Paesi UE: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Tutti gli altri (inclusi UK, US, CH, NO, IL, SG, AU, etc.) sono EXTRA-UE.
- tasso_cambio: se la valuta NON è EUR, indica il tasso di cambio approssimativo verso EUR alla data della fattura (es. per USD->EUR circa 0.92). Se la valuta è EUR, usa null.
- imponibile_eur: se la valuta NON è EUR, calcola l'equivalente in EUR usando il tasso_cambio. Se la valuta è EUR, usa null.

Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza altro testo. Esempi:
{"data":"15/03/2025","fornitore":"SiteGround Spain S.L.","descrizione":"Cloud Hosting mensile","imponibile":"80.00","valuta":"EUR","numero_fattura":"4441398","paese":"ES","area":"INTRA-UE","tasso_cambio":null,"imponibile_eur":null}
{"data":"20/03/2025","fornitore":"Stripe Inc","descrizione":"Commissioni pagamenti","imponibile":"50.00","valuta":"USD","numero_fattura":"INV-8821","paese":"US","area":"EXTRA-UE","tasso_cambio":0.92,"imponibile_eur":"46.00"}
{"data":"03/02/2025","fornitore":"Marco Rossi","descrizione":"Prestazione occasionale","imponibile":"500.00","valuta":"EUR","numero_fattura":"1","paese":"IT","area":"ITALIA","tasso_cambio":null,"imponibile_eur":null}

Se non riesci a estrarre un campo, usa "N/D".`;
