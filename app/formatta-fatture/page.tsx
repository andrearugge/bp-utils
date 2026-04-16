"use client";

import { useRef, useState } from "react";
import { parseXls } from "@/lib/formatta-fatture/parse-xls";
import { downloadCsv } from "@/lib/formatta-fatture/csv";
import { FatturaRow } from "@/lib/formatta-fatture/types";

interface LoadedFile {
  name: string;
  rows: FatturaRow[];
}

function FileDropZone({
  label,
  loaded,
  onLoad,
  onRemove,
  doc,
}: {
  label: string;
  loaded: LoadedFile | null;
  onLoad: (f: LoadedFile) => void;
  onRemove: () => void;
  doc: "Fattura" | "Nota di credito";
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    if (!file.name.toLowerCase().match(/\.(xls|xlsx)$/)) {
      setError("Seleziona un file .xls o .xlsx");
      return;
    }
    setError(null);
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseXls(buffer, doc);
      if (result.error) {
        setError(result.error);
      } else {
        onLoad({ name: file.name, rows: result.rows });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la lettura.");
    } finally {
      setIsParsing(false);
    }
  }

  if (loaded) {
    return (
      <div style={{
        border: "1px solid #1a1a1e",
        borderRadius: 8,
        padding: "20px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#111114",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#e8e6e1" }}>{label}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b6b70" }}>
            {loaded.name} — <strong style={{ color: "#e8e6e1" }}>{loaded.rows.length}</strong> righe
          </p>
        </div>
        <button
          onClick={onRemove}
          style={{ background: "none", border: "none", color: "#6b6b70", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#9b9ba0" }}>{label}</p>
      <div
        onClick={() => !isParsing && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        style={{
          border: `2px dashed ${isDragOver ? "#f59e0b" : error ? "#dc2626" : "#2a2a30"}`,
          borderRadius: 8,
          padding: "36px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          cursor: isParsing ? "wait" : "pointer",
          background: isDragOver ? "rgba(245,158,11,0.04)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span style={{ fontSize: 36, opacity: 0.3, lineHeight: 1, color: "#e8e6e1" }}>
          {isParsing ? "⟳" : "↑"}
        </span>
        <p style={{ margin: 0, color: "#e8e6e1", fontSize: 14 }}>
          {isParsing ? "Lettura…" : <><span style={{ color: "#f59e0b", fontWeight: 600 }}>Sfoglia</span> o trascina</>}
        </p>
        <p style={{ margin: 0, color: "#6b6b70", fontSize: 12 }}>.xls / .xlsx</p>
      </div>
      <input ref={inputRef} type="file" accept=".xls,.xlsx" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
      {error && (
        <p style={{ margin: 0, fontSize: 12, color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "8px 12px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function FormattaFatturePage() {
  const [fatture, setFatture] = useState<LoadedFile | null>(null);
  const [ndc, setNdc] = useState<LoadedFile | null>(null);

  const allRows = [
    ...(fatture?.rows ?? []),
    ...(ndc?.rows ?? []),
  ];
  const canDownload = allRows.length > 0;

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 28 }}>

        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8e6e1" }}>
            Formatta Fatture e Ndc
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b6b70" }}>
            Carica i file XLS di fatture e note di credito per generare un CSV unificato.
            I valori delle note di credito saranno negativi.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <FileDropZone
            label="Fatture"
            doc="Fattura"
            loaded={fatture}
            onLoad={setFatture}
            onRemove={() => setFatture(null)}
          />
          <FileDropZone
            label="Note di credito"
            doc="Nota di credito"
            loaded={ndc}
            onLoad={setNdc}
            onRemove={() => setNdc(null)}
          />
        </div>

        {canDownload && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1a1a1e", paddingTop: 20 }}>
            <span style={{ fontSize: 13, color: "#6b6b70" }}>
              {fatture && <><strong style={{ color: "#e8e6e1" }}>{fatture.rows.length}</strong> fatture</>}
              {fatture && ndc && " · "}
              {ndc && <><strong style={{ color: "#e8e6e1" }}>{ndc.rows.length}</strong> note di credito</>}
              {" · "}
              <strong style={{ color: "#e8e6e1" }}>{allRows.length}</strong> righe totali
            </span>
            <button
              onClick={() => downloadCsv(allRows)}
              style={{
                background: "#f59e0b",
                border: "none",
                borderRadius: 6,
                color: "#0a0a0b",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              Scarica CSV
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
