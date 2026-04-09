import { InvoiceRecord } from "./types";

const STORAGE_KEY = "fatture-db";

export function loadRecords(): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveRecords(records: InvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
