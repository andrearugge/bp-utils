"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { UploadTab } from "@/components/UploadTab";
import { ArchiveTab } from "@/components/ArchiveTab";
import { InvoiceRecord } from "@/lib/types";
import { loadRecords, saveRecords } from "@/lib/storage";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix: "data:<mime>;base64,"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMediaType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

function nowItalian(): string {
  return new Date().toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [records, setRecords] = useState<InvoiceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "archive">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);
  const abortRef = useRef(false);
  // Stores File objects from last batch that errored — enables retry without re-upload
  const [retryFiles, setRetryFiles] = useState<Map<string, File>>(new Map());

  // Load from localStorage on mount, pick initial tab
  useEffect(() => {
    const stored = loadRecords();
    setRecords(stored);
    if (stored.length > 0) setActiveTab("archive");
  }, []);

  function handleDelete(id: string) {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRecords(next);
      return next;
    });
  }

  function handleClear() {
    saveRecords([]);
    setRecords([]);
    setActiveTab("upload");
  }

  async function extractFile(file: File): Promise<InvoiceRecord> {
    const base64 = await toBase64(file);
    const mediaType = getMediaType(file);
    const isPdf = mediaType === "application/pdf";

    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mediaType, isPdf }),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

    return {
      id: uid(),
      data: data.data ?? "N/D",
      fornitore: data.fornitore ?? "N/D",
      descrizione: data.descrizione ?? "N/D",
      imponibile: data.imponibile ?? "0.00",
      valuta: data.valuta ?? "EUR",
      numero_fattura: data.numero_fattura ?? "N/D",
      paese: data.paese ?? "N/D",
      area: data.area ?? "EXTRA-UE",
      tasso_cambio: data.tasso_cambio ?? null,
      imponibile_eur: data.imponibile_eur ?? null,
      file: file.name,
      extracted_at: nowItalian(),
      status: "ok",
    };
  }

  function makeErrorRecord(file: File, err: unknown): InvoiceRecord {
    return {
      id: uid(),
      data: "N/D",
      fornitore: "N/D",
      descrizione: "N/D",
      imponibile: "0.00",
      valuta: "EUR",
      numero_fattura: "N/D",
      paese: "N/D",
      area: "EXTRA-UE",
      tasso_cambio: null,
      imponibile_eur: null,
      file: file.name,
      extracted_at: nowItalian(),
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  async function handleExtract(files: File[]) {
    abortRef.current = false;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, filename: "" });
    setRetryFiles(new Map()); // clear previous retry state on new batch

    let current = records; // local copy to accumulate during the loop
    const newRetryFiles = new Map<string, File>();

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;

      const file = files[i];
      setProgress({ current: i + 1, total: files.length, filename: file.name });

      let record: InvoiceRecord;
      try {
        record = await extractFile(file);
      } catch (err) {
        record = makeErrorRecord(file, err);
        newRetryFiles.set(file.name, file);
      }

      current = [...current, record];
      setRecords(current);
      saveRecords(current);
    }

    setRetryFiles(newRetryFiles);
    setIsProcessing(false);
    setProgress(null);
    abortRef.current = false;
    setActiveTab("archive");
  }

  async function handleRetryErrors() {
    const errorRecords = records.filter(
      (r) => r.status === "error" && retryFiles.has(r.file)
    );
    if (errorRecords.length === 0) return;

    abortRef.current = false;
    setIsProcessing(true);
    setProgress({ current: 0, total: errorRecords.length, filename: "" });

    const newRetryFiles = new Map(retryFiles);

    for (let i = 0; i < errorRecords.length; i++) {
      if (abortRef.current) break;

      const errorRec = errorRecords[i];
      const file = retryFiles.get(errorRec.file)!;
      setProgress({ current: i + 1, total: errorRecords.length, filename: file.name });

      let newRecord: InvoiceRecord;
      try {
        newRecord = { ...(await extractFile(file)), id: errorRec.id };
        newRetryFiles.delete(file.name); // success: remove from retry pool
      } catch (err) {
        newRecord = { ...makeErrorRecord(file, err), id: errorRec.id };
      }

      setRecords((prev) => {
        const next = prev.map((r) => (r.id === errorRec.id ? newRecord : r));
        saveRecords(next);
        return next;
      });
    }

    setRetryFiles(newRetryFiles);
    setIsProcessing(false);
    setProgress(null);
    abortRef.current = false;
  }

  function handleAbort() {
    abortRef.current = true;
  }

  const tabLabel = `Archivio (${records.length})`;

  return (
    <main
      style={{
        background: "#0a0a0b",
        minHeight: "100vh",
        color: "#e8e6e1",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
        <Header />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "upload" | "archive")}
        >
          <TabsList
            style={{
              background: "transparent",
              borderBottom: "1px solid #1a1a1e",
              borderRadius: 0,
              padding: 0,
              marginBottom: 28,
              display: "flex",
              gap: 0,
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            <TabsTrigger
              value="upload"
              style={{
                background: "transparent",
                borderRadius: 0,
                padding: "10px 20px",
                fontSize: 14,
                color: activeTab === "upload" ? "#f59e0b" : "#6b6b70",
                fontWeight: activeTab === "upload" ? 600 : 400,
                borderBottom: activeTab === "upload" ? "2px solid #f59e0b" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              + Carica fatture
            </TabsTrigger>
            <TabsTrigger
              value="archive"
              style={{
                background: "transparent",
                borderRadius: 0,
                padding: "10px 20px",
                fontSize: 14,
                color: activeTab === "archive" ? "#f59e0b" : "#6b6b70",
                fontWeight: activeTab === "archive" ? 600 : 400,
                borderBottom: activeTab === "archive" ? "2px solid #f59e0b" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tabLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <UploadTab
              isProcessing={isProcessing}
              progress={progress}
              onExtract={handleExtract}
              onAbort={handleAbort}
            />
          </TabsContent>

          <TabsContent value="archive">
            <ArchiveTab
              records={records}
              onDelete={handleDelete}
              onClear={handleClear}
              onAddMore={() => setActiveTab("upload")}
              onRetryErrors={handleRetryErrors}
              retryableErrorCount={
                records.filter((r) => r.status === "error" && retryFiles.has(r.file)).length
              }
              isProcessing={isProcessing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
