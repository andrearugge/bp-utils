import { InvoiceRecord } from "@/lib/types";

interface AreaBadgeProps {
  area: InvoiceRecord["area"];
  paese: string;
}

const styles: Record<InvoiceRecord["area"], React.CSSProperties> = {
  "EXTRA-UE": {
    background: "rgba(245,158,11,0.12)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.2)",
  },
  "INTRA-UE": {
    background: "rgba(59,130,246,0.12)",
    color: "#3b82f6",
    border: "1px solid rgba(59,130,246,0.2)",
  },
  ITALIA: {
    background: "rgba(34,197,94,0.12)",
    color: "#22c55e",
    border: "1px solid rgba(34,197,94,0.2)",
  },
};

export function AreaBadge({ area, paese }: AreaBadgeProps) {
  return (
    <span
      style={{
        ...styles[area],
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.5px",
        padding: "3px 8px",
        borderRadius: "2px",
        whiteSpace: "nowrap",
      }}
    >
      {area} · {paese}
    </span>
  );
}
