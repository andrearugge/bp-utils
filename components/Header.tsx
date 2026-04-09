export function Header() {
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
              @keyframes floatA {
                0%, 100% { transform: translateY(0px) rotate(-6deg); }
                50% { transform: translateY(-10px) rotate(-6deg); }
              }
              @keyframes floatB {
                0%, 100% { transform: translateY(0px) rotate(4deg); }
                50% { transform: translateY(-14px) rotate(4deg); }
              }
              @keyframes floatC {
                0%, 100% { transform: translateY(0px) rotate(-2deg); }
                50% { transform: translateY(-8px) rotate(-2deg); }
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes particle1 {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
                50% { transform: translateY(-18px) scale(1.2); opacity: 1; }
              }
              @keyframes particle2 {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
                50% { transform: translateY(-12px) scale(0.9); opacity: 0.9; }
              }
              @keyframes particle3 {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                50% { transform: translateY(-22px) scale(1.1); opacity: 0.8; }
              }
              @keyframes rayPulse {
                0%, 100% { opacity: 0.06; }
                50% { opacity: 0.18; }
              }
              .invoice-a { animation: floatA 4s ease-in-out infinite; transform-origin: 80px 80px; animation-delay: 0s; }
              .invoice-b { animation: floatB 5s ease-in-out infinite; transform-origin: 160px 70px; animation-delay: 0.8s; }
              .invoice-c { animation: floatC 3.5s ease-in-out infinite; transform-origin: 240px 85px; animation-delay: 1.4s; }
              .fade-in { animation: fadeIn 0.8s ease-out both; }
              .p1 { animation: particle1 3.2s ease-in-out infinite; animation-delay: 0.3s; }
              .p2 { animation: particle2 2.8s ease-in-out infinite; animation-delay: 1.1s; }
              .p3 { animation: particle3 3.8s ease-in-out infinite; animation-delay: 0.6s; }
              .p4 { animation: particle1 2.5s ease-in-out infinite; animation-delay: 1.8s; }
              .p5 { animation: particle2 4s ease-in-out infinite; animation-delay: 0.9s; }
              .ray { animation: rayPulse 3s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* Light rays */}
          <g className="ray">
            <line x1="160" y1="10" x2="60" y2="130" stroke="#f59e0b" strokeWidth="40" strokeOpacity="0.08" />
            <line x1="160" y1="10" x2="160" y2="140" stroke="#f59e0b" strokeWidth="30" strokeOpacity="0.06" />
            <line x1="160" y1="10" x2="260" y2="130" stroke="#f59e0b" strokeWidth="40" strokeOpacity="0.08" />
          </g>

          {/* Invoice A — left, tilted */}
          <g className="invoice-a fade-in" style={{ animationDelay: "0.1s" }}>
            <rect x="42" y="45" width="76" height="96" rx="3" fill="#1a1a1e" stroke="#2a2a30" strokeWidth="1.5" />
            <rect x="50" y="55" width="40" height="5" rx="1" fill="#2a2a30" />
            <rect x="50" y="65" width="56" height="3" rx="1" fill="#222226" />
            <rect x="50" y="72" width="48" height="3" rx="1" fill="#222226" />
            <rect x="50" y="79" width="52" height="3" rx="1" fill="#222226" />
            <rect x="50" y="90" width="56" height="1.5" rx="0.5" fill="#2a2a30" />
            <text x="50" y="108" fontSize="10" fontWeight="700" fill="#f59e0b" fontFamily="monospace">€ 120,00</text>
          </g>

          {/* Invoice B — center, slightly tilted right */}
          <g className="invoice-b fade-in" style={{ animationDelay: "0.3s" }}>
            <rect x="122" y="28" width="76" height="96" rx="3" fill="#16161a" stroke="#2a2a30" strokeWidth="1.5" />
            <rect x="130" y="38" width="44" height="5" rx="1" fill="#2a2a30" />
            <rect x="130" y="48" width="56" height="3" rx="1" fill="#1e1e22" />
            <rect x="130" y="55" width="48" height="3" rx="1" fill="#1e1e22" />
            <rect x="130" y="62" width="52" height="3" rx="1" fill="#1e1e22" />
            <rect x="130" y="73" width="56" height="1.5" rx="0.5" fill="#2a2a30" />
            <text x="130" y="91" fontSize="10" fontWeight="700" fill="#f59e0b" fontFamily="monospace">$ 850,00</text>
            <text x="130" y="104" fontSize="8" fill="#6b6b70" fontFamily="monospace">INV-2847</text>
          </g>

          {/* Invoice C — right */}
          <g className="invoice-c fade-in" style={{ animationDelay: "0.5s" }}>
            <rect x="202" y="40" width="76" height="96" rx="3" fill="#1a1a1e" stroke="#2a2a30" strokeWidth="1.5" />
            <rect x="210" y="50" width="38" height="5" rx="1" fill="#2a2a30" />
            <rect x="210" y="60" width="56" height="3" rx="1" fill="#222226" />
            <rect x="210" y="67" width="44" height="3" rx="1" fill="#222226" />
            <rect x="210" y="74" width="50" height="3" rx="1" fill="#222226" />
            <rect x="210" y="85" width="56" height="1.5" rx="0.5" fill="#2a2a30" />
            <text x="210" y="103" fontSize="10" fontWeight="700" fill="#f59e0b" fontFamily="monospace">£ 299,00</text>
          </g>

          {/* Amber particles */}
          <circle className="p1" cx="100" cy="38" r="3" fill="#f59e0b" />
          <circle className="p2" cx="155" cy="20" r="2" fill="#f59e0b" />
          <circle className="p3" cx="215" cy="30" r="2.5" fill="#f59e0b" />
          <circle className="p4" cx="258" cy="48" r="1.8" fill="#f59e0b" />
          <circle className="p5" cx="68" cy="32" r="2" fill="#f59e0b" />
          <circle className="p1" cx="180" cy="15" r="1.5" fill="#f59e0b" />
        </svg>
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 300,
          color: "#e8e6e1",
          letterSpacing: "-0.5px",
          margin: 0,
        }}
      >
        Conversione fatture
      </h1>
    </div>
  );
}
