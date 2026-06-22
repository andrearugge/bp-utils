"use client";

import { useEffect, useRef, useState } from "react";

interface PinModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CORRECT_PIN = "1992";

export function PinModal({ onSuccess, onCancel }: PinModalProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [backdropReady, setBackdropReady] = useState(false);
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    inputRefs[0].current?.focus();
    // Delay backdrop click to avoid the toggle's click event bleeding through
    const t = setTimeout(() => setBackdropReady(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(false);

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (index === 3 && value) {
      const pin = next.join("");
      if (pin === CORRECT_PIN) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => {
          setDigits(["", "", "", ""]);
          setError(false);
          inputRefs[0].current?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      e.preventDefault();
      const next = pasted.split("");
      setDigits(next);
      setError(false);
      inputRefs[3].current?.focus();
      if (pasted === CORRECT_PIN) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => {
          setDigits(["", "", "", ""]);
          setError(false);
          inputRefs[0].current?.focus();
        }, 600);
      }
    }
  };

  return (
    <div
      onClick={backdropReady ? onCancel : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.55)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111113",
          border: "1px solid #2a2a30",
          borderRadius: 12,
          padding: "36px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          minWidth: 300,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              color: "#e8e6e1",
              letterSpacing: "-0.2px",
            }}
          >
            Accesso Admin
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#6b6b70",
            }}
          >
            Inserisci il PIN a 4 cifre
          </p>
        </div>

        <div
          onPaste={handlePaste}
          style={{ display: "flex", gap: 12 }}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 52,
                height: 60,
                textAlign: "center",
                fontSize: 22,
                fontWeight: 600,
                background: "#0a0a0b",
                border: `1px solid ${error ? "#ef4444" : d ? "#f59e0b" : "#2a2a30"}`,
                borderRadius: 8,
                color: "#e8e6e1",
                outline: "none",
                caretColor: "transparent",
                transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>PIN non corretto</p>
        )}

        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            border: "1px solid #2a2a30",
            borderRadius: 6,
            color: "#6b6b70",
            fontSize: 13,
            padding: "8px 20px",
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#4a4a50";
            (e.currentTarget as HTMLButtonElement).style.color = "#e8e6e1";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a30";
            (e.currentTarget as HTMLButtonElement).style.color = "#6b6b70";
          }}
        >
          Annulla
        </button>
      </div>
    </div>
  );
}
