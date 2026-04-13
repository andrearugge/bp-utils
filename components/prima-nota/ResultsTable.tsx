"use client";

import { useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AzioneBadge } from "./AzioneBadge";
import { PrimaNotaRow, AzioneFilter } from "@/lib/prima-nota/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResultsTableProps {
  rows: PrimaNotaRow[];
  fileName: string;
  filter: AzioneFilter;
  editedAzioni: Record<number, string>;
  editedFornitori: Record<number, string>;
  editedDescrizioni: Record<number, string>;
  onFilterChange: (filter: AzioneFilter) => void;
  onAzioneChange: (idx: number, azione: "Inserisci" | "Escludi" | "Verifica") => void;
  onFornitoreChange: (idx: number, value: string) => void;
  onDescrizioneChange: (idx: number, value: string) => void;
  onNewFile: () => void;
  onDownload: (soloInserisci: boolean) => void;
}

// ─── Badge azione cycling ─────────────────────────────────────────────────────

const AZIONE_CYCLE: Record<string, "Inserisci" | "Escludi" | "Verifica"> = {
  Inserisci: "Escludi",
  Escludi: "Verifica",
  Verifica: "Inserisci",
};

// ─── Row colour helpers ───────────────────────────────────────────────────────

const ROW_BG: Record<string, string> = {
  Inserisci: "rgba(5, 150, 105, 0.08)",
  Escludi: "rgba(220, 38, 38, 0.08)",
  Verifica: "rgba(217, 119, 6, 0.08)",
};

const ROW_COLOR: Record<string, string> = {
  Inserisci: "#d1fae5",
  Escludi: "#fee2e2",
  Verifica: "#fef3c7",
};

// ─── Filter pill colours ──────────────────────────────────────────────────────

const FILTER_ACTIVE_BG: Record<string, string> = {
  Tutti: "#e8e6e1",
  Inserisci: "#059669",
  Escludi: "#dc2626",
  Verifica: "#d97706",
};

const FILTER_ACTIVE_COLOR: Record<string, string> = {
  Tutti: "#0a0a0b",
  Inserisci: "#fff",
  Escludi: "#fff",
  Verifica: "#fff",
};

// ─── Inline editable cell ────────────────────────────────────────────────────

interface EditableCellProps {
  value: string;
  rowColor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function EditableCell({ value, rowColor, onChange, placeholder }: EditableCellProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: "1px solid transparent",
        color: rowColor,
        fontSize: 12,
        padding: "2px 4px",
        width: "100%",
        minWidth: 80,
        outline: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderBottomColor = "#3b3b3f";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderBottomColor = "transparent";
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ResultsTable({
  rows,
  fileName,
  filter,
  editedAzioni,
  editedFornitori,
  editedDescrizioni,
  onFilterChange,
  onAzioneChange,
  onFornitoreChange,
  onDescrizioneChange,
  onNewFile,
  onDownload,
}: ResultsTableProps) {
  // Compute effective values (with overrides applied)
  const effective = rows.map((row) => ({
    ...row,
    azione: (editedAzioni[row.idx] as PrimaNotaRow["azione"]) ?? row.azione,
    fornitore: editedFornitori[row.idx] ?? row.fornitore,
    descrizione: editedDescrizioni[row.idx] ?? row.descrizione,
  }));

  // Counts per azione (after overrides)
  const counts = { Inserisci: 0, Escludi: 0, Verifica: 0 };
  for (const r of effective) counts[r.azione]++;

  const FILTERS: AzioneFilter[] = ["Tutti", "Inserisci", "Escludi", "Verifica"];

  const FILTER_LABELS: Record<AzioneFilter, string> = {
    Tutti: `Tutti (${effective.length})`,
    Inserisci: `Inserisci (${counts.Inserisci})`,
    Escludi: `Escludi (${counts.Escludi})`,
    Verifica: `Verifica (${counts.Verifica})`,
  };

  const filtered =
    filter === "Tutti" ? effective : effective.filter((r) => r.azione === filter);

  return (
    <div>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#0a0a0b",
          borderBottom: "1px solid #1a1a1e",
          paddingBottom: 12,
          marginBottom: 4,
        }}
      >
        {/* File info + actions row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ color: "#6b6b70", fontSize: 13, flexShrink: 0 }}>
            <span style={{ color: "#e8e6e1", fontWeight: 600 }}>{fileName}</span>
            {" · "}
            {effective.length} righe
          </span>

          <div style={{ flex: 1 }} />

          {/* Action buttons */}
          <button
            onClick={onNewFile}
            style={{
              background: "transparent",
              border: "1px solid #3b3b3f",
              borderRadius: 6,
              color: "#e8e6e1",
              fontSize: 12,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ← Nuovo file
          </button>
          <button
            onClick={() => onDownload(true)}
            style={{
              background: "#059669",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ↓ CSV solo Inserisci
          </button>
          <button
            onClick={() => onDownload(false)}
            style={{
              background: "#1a1a1e",
              border: "1px solid #2a2a30",
              borderRadius: 6,
              color: "#e8e6e1",
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ↓ CSV completo
          </button>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {FILTERS.map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                style={{
                  background: isActive ? FILTER_ACTIVE_BG[f] : "transparent",
                  color: isActive ? FILTER_ACTIVE_COLOR[f] : "#6b6b70",
                  border: `1px solid ${isActive ? FILTER_ACTIVE_BG[f] : "#2a2a30"}`,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  padding: "3px 12px",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {FILTER_LABELS[f]}
              </button>
            );
          })}
          <span style={{ color: "#3b3b3f", fontSize: 11, marginLeft: 4 }}>
            Clicca badge per cambiare azione · Clicca Fornitore o Descrizione per editare
          </span>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Table>
        <TableHeader>
          <TableRow style={{ borderBottom: "1px solid #1a1a1e" }}>
            <TableHead style={{ color: "#6b6b70", fontSize: 11, width: 90 }}>Azione</TableHead>
            <TableHead style={{ color: "#6b6b70", fontSize: 11, width: 90 }}>Data</TableHead>
            <TableHead style={{ color: "#6b6b70", fontSize: 11, minWidth: 120 }}>Fornitore</TableHead>
            <TableHead style={{ color: "#6b6b70", fontSize: 11, minWidth: 160 }}>Descrizione</TableHead>
            <TableHead style={{ color: "#6b6b70", fontSize: 11, width: 90 }}>Imponibile</TableHead>
            <TableHead style={{ color: "#4b4b50", fontSize: 11, minWidth: 160 }}>Desc. originale</TableHead>
            <TableHead style={{ color: "#4b4b50", fontSize: 11, minWidth: 140 }}>Sottoconto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((row) => {
            const bg = ROW_BG[row.azione];
            const textColor = ROW_COLOR[row.azione];
            return (
              <TableRow
                key={row.idx}
                style={{
                  background: bg,
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}
                className="hover:!bg-white/5"
              >
                {/* Azione badge — click to cycle */}
                <TableCell>
                  <AzioneBadge
                    azione={row.azione}
                    onClick={() => onAzioneChange(row.idx, AZIONE_CYCLE[row.azione])}
                  />
                </TableCell>

                {/* Data */}
                <TableCell style={{ color: "#6b6b70", fontSize: 12 }}>
                  {row.data}
                </TableCell>

                {/* Fornitore — editable */}
                <TableCell>
                  <EditableCell
                    value={row.fornitore}
                    rowColor={textColor}
                    onChange={(v) => onFornitoreChange(row.idx, v)}
                    placeholder="—"
                  />
                </TableCell>

                {/* Descrizione — editable */}
                <TableCell>
                  <EditableCell
                    value={row.descrizione}
                    rowColor={textColor}
                    onChange={(v) => onDescrizioneChange(row.idx, v)}
                    placeholder="—"
                  />
                </TableCell>

                {/* Imponibile */}
                <TableCell style={{ color: "#e8e6e1", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                  {row.importo}
                </TableCell>

                {/* Desc. originale — reference only */}
                <TableCell
                  style={{
                    color: "#4b4b50",
                    fontSize: 11,
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.rawDesc}
                >
                  {row.rawDesc}
                </TableCell>

                {/* Sottoconto — reference only */}
                <TableCell
                  style={{
                    color: "#4b4b50",
                    fontSize: 11,
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.sottoconto}
                >
                  {row.sottoconto}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#6b6b70", fontSize: 14, padding: "32px 0" }}>
          Nessuna riga corrisponde al filtro selezionato.
        </p>
      )}
    </div>
  );
}
