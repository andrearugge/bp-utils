export function PrimaNotaHeader() {
  return (
    <div className="flex flex-col items-center pt-10 pb-6 select-none">
      {/* Animated SVG illustration */}
      <div style={{ width: 320, height: 140, position: "relative", marginBottom: 20 }}>
        <svg
          width="320"
          height="140"
          viewBox="0 0 320 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: "visible" }}
        >
          <defs>
            <style>{`
              @keyframes pnFloatDoc {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
              }
              @keyframes pnCheckPop {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.12); }
              }
              @keyframes pnFadeIn {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes pnParticle1 {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
                50% { transform: translateY(-18px) scale(1.2); opacity: 1; }
              }
              @keyframes pnParticle2 {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
                50% { transform: translateY(-12px) scale(0.9); opacity: 0.9; }
              }
              @keyframes pnRayPulse {
                0%, 100% { opacity: 0.06; }
                50% { opacity: 0.18; }
              }
              .pn-doc { animation: pnFloatDoc 4s ease-in-out infinite; transform-origin: 160px 70px; }
              .pn-check { animation: pnCheckPop 3s ease-in-out infinite; animation-delay: 0.5s; transform-origin: 226px 52px; }
              .pn-fadein { animation: pnFadeIn 0.8s ease-out both; }
              .pn-p1 { animation: pnParticle1 3.2s ease-in-out infinite; animation-delay: 0.3s; }
              .pn-p2 { animation: pnParticle2 2.8s ease-in-out infinite; animation-delay: 1.1s; }
              .pn-p3 { animation: pnParticle1 3.8s ease-in-out infinite; animation-delay: 0.6s; }
              .pn-p4 { animation: pnParticle2 2.5s ease-in-out infinite; animation-delay: 1.8s; }
              .pn-ray { animation: pnRayPulse 3s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* Light rays */}
          <g className="pn-ray">
            <line x1="160" y1="10" x2="60" y2="130" stroke="#f59e0b" strokeWidth="40" strokeOpacity="0.08" />
            <line x1="160" y1="10" x2="160" y2="140" stroke="#f59e0b" strokeWidth="30" strokeOpacity="0.06" />
            <line x1="160" y1="10" x2="260" y2="130" stroke="#f59e0b" strokeWidth="40" strokeOpacity="0.08" />
          </g>

          {/* Document — center */}
          <g className="pn-doc pn-fadein">
            <rect x="108" y="18" width="104" height="116" rx="4" fill="#1a1a1e" stroke="#2a2a30" strokeWidth="1.5" />
            {/* Header bar */}
            <rect x="118" y="30" width="52" height="6" rx="1" fill="#2a2a30" />
            {/* Content lines */}
            <rect x="118" y="46" width="74" height="3" rx="1" fill="#222226" />
            <rect x="118" y="53" width="62" height="3" rx="1" fill="#222226" />
            <rect x="118" y="60" width="68" height="3" rx="1" fill="#222226" />
            <rect x="118" y="71" width="74" height="1.5" rx="0.5" fill="#2a2a30" />
            <rect x="118" y="79" width="58" height="3" rx="1" fill="#222226" />
            <rect x="118" y="86" width="66" height="3" rx="1" fill="#222226" />
            <rect x="118" y="93" width="50" height="3" rx="1" fill="#222226" />
            {/* Green "classified" rows */}
            <rect x="118" y="104" width="42" height="3" rx="1" fill="rgba(5,150,105,0.45)" />
            <rect x="118" y="111" width="56" height="3" rx="1" fill="rgba(5,150,105,0.3)" />
            <rect x="118" y="118" width="36" height="3" rx="1" fill="rgba(220,38,38,0.3)" />
          </g>

          {/* Checkmark badge — top right of document */}
          <g className="pn-check pn-fadein" style={{ animationDelay: "0.3s" }}>
            <circle cx="226" cy="52" r="26" fill="#0a0a0b" stroke="#f59e0b" strokeWidth="2" />
            <polyline
              points="214,52 221,60 238,44"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* Amber particles */}
          <circle className="pn-p1" cx="92" cy="36" r="3" fill="#f59e0b" />
          <circle className="pn-p2" cx="158" cy="12" r="2" fill="#f59e0b" />
          <circle className="pn-p3" cx="258" cy="32" r="2.5" fill="#f59e0b" />
          <circle className="pn-p4" cx="274" cy="80" r="1.8" fill="#f59e0b" />
          <circle className="pn-p1" cx="76" cy="82" r="2" fill="#f59e0b" />
        </svg>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 300,
          color: "#e8e6e1",
          letterSpacing: "-0.5px",
          margin: "0 0 4px",
          textAlign: "center",
        }}
      >
        Classifica prima nota
      </h1>
      <p style={{ color: "#6b6b70", fontSize: 14, margin: 0, textAlign: "center" }}>
        Classifica le voci della prima nota e genera il CSV per il Business Plan
      </p>
    </div>
  );
}
