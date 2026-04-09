"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadTabProps {
  isProcessing: boolean;
  progress: { current: number; total: number; filename: string } | null;
  onExtract: (files: File[]) => void;
  onAbort: () => void;
}

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_FILES = 100;

export function UploadTab({ isProcessing, progress, onExtract, onAbort }: UploadTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const merged = [...files];
    for (const f of Array.from(incoming)) {
      if (merged.length >= MAX_FILES) break;
      if (!merged.find((x) => x.name === f.name && x.size === f.size)) {
        merged.push(f);
      }
    }
    setFiles(merged.slice(0, MAX_FILES));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function handleExtract() {
    if (files.length === 0 || isProcessing) return;
    onExtract(files);
    setFiles([]);
  }

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Dropzone */}
      <div
        onClick={() => !isProcessing && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragOver ? "#f59e0b" : "#2a2a30"}`,
          borderRadius: 8,
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          cursor: isProcessing ? "default" : "pointer",
          background: isDragOver ? "rgba(245,158,11,0.04)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span style={{ fontSize: 48, opacity: 0.3, lineHeight: 1, color: "#e8e6e1" }}>↑</span>
        <p style={{ margin: 0, color: "#e8e6e1", fontSize: 15 }}>
          Trascina qui oppure{" "}
          <span style={{ color: "#f59e0b", fontWeight: 600 }}>sfoglia</span>
        </p>
        <p style={{ margin: 0, color: "#6b6b70", fontSize: 13 }}>
          PDF, PNG, JPG — max {MAX_FILES} file
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        style={{ display: "none" }}
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={{ color: "#6b6b70", fontSize: 13, margin: 0 }}>
            {files.length} {files.length === 1 ? "file selezionato" : "file selezionati"}
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#141417",
                  border: "1px solid #2a2a30",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 12,
                  color: "#ccc",
                  maxWidth: 220,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                  title={f.name}
                >
                  {f.name}
                </span>
                {!isProcessing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b6b70",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                    aria-label="Rimuovi file"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {isProcessing && progress && (
        <div className="flex flex-col gap-2">
          <p style={{ color: "#6b6b70", fontSize: 13, margin: 0 }}>
            {progress.current}/{progress.total}:{" "}
            <span style={{ color: "#e8e6e1" }}>{progress.filename}</span>
          </p>
          <Progress
            value={progressPercent}
            style={{ height: 3, background: "#1a1a1e" }}
            className="[&>div]:bg-amber-500"
          />
        </div>
      )}

      {/* Buttons */}
      {isProcessing ? (
        <Button
          variant="outline"
          size="lg"
          className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
          onClick={onAbort}
        >
          Interrompi — i dati estratti finora sono già salvati
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full font-bold"
          disabled={files.length === 0}
          onClick={handleExtract}
          style={
            files.length > 0
              ? { background: "#f59e0b", color: "#0a0a0b" }
              : undefined
          }
        >
          {files.length > 0
            ? `Estrai dati da ${files.length} ${files.length === 1 ? "file" : "file"}`
            : "Estrai dati"}
        </Button>
      )}
    </div>
  );
}
