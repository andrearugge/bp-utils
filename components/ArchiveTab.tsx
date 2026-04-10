"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AreaBadge } from "@/components/AreaBadge";
import { InvoiceRecord, AreaFilter } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";

interface ArchiveTabProps {
  records: InvoiceRecord[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onAddMore: () => void;
  onRetryErrors?: () => void;
  retryableErrorCount?: number;
  isProcessing?: boolean;
}

const AREA_FILTERS: { label: string; value: AreaFilter }[] = [
  { label: "Tutte", value: "ALL" },
  { label: "EXTRA-UE", value: "EXTRA-UE" },
  { label: "INTRA-UE", value: "INTRA-UE" },
  { label: "ITALIA", value: "ITALIA" },
];

const filterActiveStyle: Record<AreaFilter, React.CSSProperties> = {
  ALL: { background: "#e8e6e1", color: "#0a0a0b", borderColor: "#e8e6e1" },
  "EXTRA-UE": { background: "#f59e0b", color: "#0a0a0b", borderColor: "#f59e0b" },
  "INTRA-UE": { background: "#3b82f6", color: "#0a0a0b", borderColor: "#3b82f6" },
  ITALIA: { background: "#22c55e", color: "#0a0a0b", borderColor: "#22c55e" },
};

function formatEur(value: number): string {
  return (
    "€ " +
    value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function parseAmount(str: string): number {
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

export function ArchiveTab({
  records,
  onDelete,
  onClear,
  onAddMore,
  onRetryErrors,
  retryableErrorCount = 0,
  isProcessing = false,
}: ArchiveTabProps) {
  const [filter, setFilter] = useState<AreaFilter>("ALL");

  const filtered = filter === "ALL" ? records : records.filter((r) => r.area === filter);

  const counts: Record<AreaFilter, number> = {
    ALL: records.length,
    "EXTRA-UE": records.filter((r) => r.area === "EXTRA-UE").length,
    "INTRA-UE": records.filter((r) => r.area === "INTRA-UE").length,
    ITALIA: records.filter((r) => r.area === "ITALIA").length,
  };

  const errorCount = filtered.filter((r) => r.status === "error").length;

  const totalEur = filtered
    .filter((r) => r.status === "ok")
    .reduce((acc, r) => {
      const amount =
        r.valuta === "EUR"
          ? parseAmount(r.imponibile)
          : parseAmount(r.imponibile_eur ?? r.imponibile);
      return acc + amount;
    }, 0);

  const filterLabel = filter === "ALL" ? "" : filter;

  if (records.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4"
        style={{ padding: "80px 0", color: "#6b6b70" }}
      >
        <span style={{ fontSize: 64, opacity: 0.3 }}>∅</span>
        <p style={{ margin: 0, fontSize: 15 }}>Nessuna fattura nell&apos;archivio</p>
        <Button
          variant="outline"
          onClick={onAddMore}
          style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
        >
          Carica fatture
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats cards */}
      <div className="flex flex-wrap gap-3">
        <Card style={{ background: "#111114", border: "1px solid #1a1a1e", flex: "1 1 140px" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ color: "#6b6b70", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
              {filter === "ALL" ? "Fatture" : `Fatture ${filterLabel}`}
            </p>
            <p style={{ color: "#e8e6e1", fontSize: 24, fontWeight: 600, margin: "4px 0 0" }}>
              {filtered.length}
            </p>
          </CardContent>
        </Card>

        <Card style={{ background: "#111114", border: "1px solid #1a1a1e", flex: "1 1 140px" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ color: "#6b6b70", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
              Errori
            </p>
            <p
              style={{
                color: errorCount > 0 ? "#ef4444" : "#6b6b70",
                fontSize: 24,
                fontWeight: 600,
                margin: "4px 0 0",
              }}
            >
              {errorCount}
            </p>
          </CardContent>
        </Card>

        <Card style={{ background: "#111114", border: "1px solid #1a1a1e", flex: "1 1 180px" }}>
          <CardContent className="pt-4 pb-4">
            <p style={{ color: "#6b6b70", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
              Totale imponibile (EUR)
            </p>
            <p style={{ color: "#f59e0b", fontSize: 22, fontWeight: 600, margin: "4px 0 0" }}>
              {formatEur(totalEur)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Area filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span style={{ color: "#6b6b70", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Filtra:
        </span>
        {AREA_FILTERS.map(({ label, value }) => (
          <Button
            key={value}
            variant="outline"
            size="sm"
            onClick={() => setFilter(value)}
            style={
              filter === value
                ? filterActiveStyle[value]
                : { background: "transparent", borderColor: "#2a2a30", color: "#6b6b70" }
            }
          >
            {label} ({counts[value]})
          </Button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #1a1a1e" }}>
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "#1a1a1e" }}>
              <TableHead style={{ width: 24 }} />
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Data</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Fornitore</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>N.Fatt.</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Descrizione</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Area</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11, textAlign: "right" }}>Originale</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Val.</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11, textAlign: "right" }}>EUR</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>Cambio</TableHead>
              <TableHead style={{ color: "#6b6b70", fontSize: 11 }}>File</TableHead>
              <TableHead style={{ width: 32 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              if (r.status === "error") {
                return (
                  <TableRow key={r.id} style={{ borderColor: "#1a1a1e" }}>
                    <TableCell>
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                        }}
                      />
                    </TableCell>
                    <TableCell
                      colSpan={10}
                      style={{ color: "#ef4444", fontSize: 12 }}
                    >
                      {r.file} — {r.error ?? "Errore sconosciuto"}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() => onDelete(r.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#444",
                            cursor: "pointer",
                            fontSize: 14,
                            padding: "2px 4px",
                          }}
                          aria-label="Elimina"
                        >
                          ✕
                        </TooltipTrigger>
                        <TooltipContent>Elimina</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              }

              return (
                <TableRow key={r.id} style={{ borderColor: "#1a1a1e" }}>
                  <TableCell>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    />
                  </TableCell>
                  <TableCell style={{ color: "#ccc", whiteSpace: "nowrap", fontSize: 13 }}>
                    {r.data}
                  </TableCell>
                  <TableCell
                    style={{
                      color: "#e8e6e1",
                      fontWeight: 500,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 13,
                    }}
                    title={r.fornitore}
                  >
                    {r.fornitore}
                  </TableCell>
                  <TableCell style={{ color: "#888", fontSize: 11 }}>{r.numero_fattura}</TableCell>
                  <TableCell
                    style={{
                      color: "#ccc",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                    }}
                    title={r.descrizione}
                  >
                    {r.descrizione}
                  </TableCell>
                  <TableCell>
                    <AreaBadge area={r.area} paese={r.paese} />
                  </TableCell>
                  <TableCell
                    style={{
                      textAlign: "right",
                      color: r.valuta === "EUR" ? "#f59e0b" : "#ccc",
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.imponibile}
                  </TableCell>
                  <TableCell style={{ color: "#888", fontSize: 11 }}>{r.valuta}</TableCell>
                  <TableCell
                    style={{
                      textAlign: "right",
                      color: "#f59e0b",
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.valuta === "EUR" ? "—" : r.imponibile_eur ? `€ ${r.imponibile_eur}` : "—"}
                  </TableCell>
                  <TableCell style={{ color: "#555", fontSize: 11 }}>
                    {r.tasso_cambio != null ? r.tasso_cambio.toFixed(4) : ""}
                  </TableCell>
                  <TableCell
                    style={{
                      color: "#555",
                      fontSize: 11,
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={r.file}
                  >
                    {r.file}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => onDelete(r.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#444",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "2px 4px",
                        }}
                        aria-label="Elimina"
                      >
                        ✕
                      </TooltipTrigger>
                      <TooltipContent>Elimina</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        style={{ borderTop: "1px solid #1a1a1e", paddingTop: 16 }}
      >
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" style={{ borderColor: "#ef4444", color: "#ef4444" }}>
                Svuota archivio
              </Button>
            }
          />
          <AlertDialogContent style={{ background: "#111114", border: "1px solid #1a1a1e" }}>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ color: "#e8e6e1" }}>Svuotare l&apos;archivio?</AlertDialogTitle>
              <AlertDialogDescription style={{ color: "#6b6b70" }}>
                Questa azione eliminerà tutte le {records.length} fatture salvate. Non è reversibile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel style={{ background: "transparent", borderColor: "#2a2a30", color: "#e8e6e1" }}>
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                style={{ background: "#ef4444", color: "#fff" }}
              >
                Sì, elimina tutto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-2">
          {retryableErrorCount > 0 && onRetryErrors && (
            <Button
              variant="outline"
              onClick={onRetryErrors}
              disabled={isProcessing}
              style={{ borderColor: "#ef4444", color: "#ef4444" }}
            >
              Rianalizza errori ({retryableErrorCount})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onAddMore}
            style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
          >
            + Aggiungi
          </Button>
          <Button
            onClick={() => downloadCsv(records, filter)}
            style={{ background: "#f59e0b", color: "#0a0a0b", fontWeight: 700 }}
          >
            Scarica CSV ({filtered.length}
            {filter !== "ALL" ? ` ${filter}` : ""})
          </Button>
        </div>
      </div>
    </div>
  );
}
