"use client";

import { useRef, useState } from "react";
import { parseCsvFile, mergeCsvFiles, CsvFile } from "@/lib/merge-csv/merge";

interface FileEntry {
  file: CsvFile;
}

interface ErrorEntry {
  name: string;
  error: string;
}

export default function MergeCsvPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFiles(fileList: FileList) {
    const newFiles: FileEntry[] = [];
    const newErrors: ErrorEntry[] = [];

    for (const f of Array.from(fileList)) {
      if (!f.name.toLowerCase().endsWith(".csv")) {
        newErrors.push({ name: f.name, error: "Non è un file .csv" });
        continue;
      }
      // Skip duplicates
      if (files.some((e) => e.file.name === f.name)) continue;

      const text = await f.text();
      const result = parseCsvFile(f.name, text);
      if (result.error) {
        newErrors.push({ name: f.name, error: result.error });
      } else {
        newFiles.push({ file: result.file! });
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setErrors((prev) => [...prev, ...newErrors]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((e) => e.file.name !== name));
  }

  function handleDownload() {
    const content = mergeCsvFiles(files.map((e) => e.file));
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged_BP.csv";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  const totalRows = files.reduce((s, e) => s + e.file.rowCount, 0);

  return (
    <main style={{ background: "#0a0a0b", minHeight: "100vh", color: "#e8e6e1" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 60px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8e6e1" }}>
            Merge CSV
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b6b70" }}>
            Unisci più file CSV in formato Business Plan in un unico file.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragOver ? "#f59e0b" : "#2a2a30"}`,
            borderRadius: 8,
            padding: "40px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            background: isDragOver ? "rgba(245,158,11,0.04)" : "transparent",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <span style={{ fontSize: 40, opacity: 0.3, lineHeight: 1, color: "#e8e6e1" }}>↑</span>
          <p style={{ margin: 0, color: "#e8e6e1", fontSize: 15 }}>
            Trascina qui oppure <span style={{ color: "#f59e0b", fontWeight: 600 }}>sfoglia</span>
          </p>
          <p style={{ margin: 0, color: "#6b6b70", fontSize: 13 }}>
            Solo file .csv con la struttura BP — puoi aggiungerne più di uno
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          onChange={handleChange}
        />

        {/* Error list */}
        {errors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {errors.map((e) => (
              <div
                key={e.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(220,38,38,0.08)",
                  border: "1px solid rgba(220,38,38,0.2)",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  color: "#dc2626",
                  gap: 12,
                }}
              >
                <span><strong>{e.name}</strong> — {e.error}</span>
                <button
                  onClick={() => setErrors((prev) => prev.filter((x) => x.name !== e.name))}
                  style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((e) => (
              <div
                key={e.file.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#111114",
                  border: "1px solid #1a1a1e",
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span style={{ color: "#e8e6e1" }}>{e.file.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ color: "#6b6b70" }}>{e.file.rowCount} righe</span>
                  <button
                    onClick={() => removeFile(e.file.name)}
                    style={{ background: "none", border: "none", color: "#6b6b70", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              </div>
            ))}

            {/* Summary + download */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
              <span style={{ fontSize: 13, color: "#6b6b70" }}>
                {files.length} file · <strong style={{ color: "#e8e6e1" }}>{totalRows}</strong> righe totali
              </span>
              <button
                onClick={handleDownload}
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
                Scarica CSV unificato
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
