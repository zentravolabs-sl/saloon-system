import React from "react";

export type ModuleTileKey =
  | "bookings"
  | "customers"
  | "services"
  | "staff"
  | "inventory"
  | "sales"
  | "reports"
  | "settings";

export function ModuleTileArtwork({
  type,
  className = "",
}: {
  type: ModuleTileKey;
  className?: string;
}) {
  switch (type) {
    case "bookings":
      return <BookingsArt className={className} />;
    case "customers":
      return <CustomersArt className={className} />;
    case "services":
      return <ServicesArt className={className} />;
    case "staff":
      return <StaffArt className={className} />;
    case "inventory":
      return <InventoryArt className={className} />;
    case "sales":
      return <SalesArt className={className} />;
    case "reports":
      return <ReportsArt className={className} />;
    case "settings":
      return <SettingsArt className={className} />;
  }
}

/* -------------------------------------------------------------------------- */
/* 1. BOOKINGS - 3D Spiral Calendar + Checkmark Badge                         */
/* -------------------------------------------------------------------------- */
function BookingsArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="bk-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#2E1065" floodOpacity="0.42" />
        </filter>
        <filter id="bk-check-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#3B0764" floodOpacity="0.45" />
        </filter>
        <linearGradient id="bk-body" x1="40" y1="26" x2="145" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#DDD6FE" />
        </linearGradient>
        <linearGradient id="bk-edge" x1="32" y1="100" x2="155" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient id="bk-stand" x1="130" y1="35" x2="168" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B21B6" />
          <stop offset="100%" stopColor="#3B0764" />
        </linearGradient>
        <linearGradient id="bk-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E9D5FF" />
          <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient id="bk-badge" x1="95" y1="62" x2="136" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>

      {/* Ambient background glow */}
      <circle cx="115" cy="80" r="68" fill="#A855F7" fillOpacity="0.18" />

      <g filter="url(#bk-shadow)">
        {/* Rear easel stand */}
        <path
          d="M142 32 L166 105 C167 109 164 112 160 112 L126 112 Z"
          fill="url(#bk-stand)"
        />

        {/* 3D Calendar bottom/side thickness */}
        <path
          d="M46 39 C47 33 53 29 59 29 L144 26 C151 26 155 31 154 38 L143 114 C142 120 136 124 129 124 L41 121 C34 121 30 115 32 109 Z"
          fill="url(#bk-edge)"
        />

        {/* Main 3D Calendar front face */}
        <path
          d="M45 35 C46 29 52 25 58 25 L142 22 C149 22 153 27 152 34 L141 107 C140 113 134 117 127 117 L40 114 C33 114 29 108 31 102 Z"
          fill="url(#bk-body)"
        />

        {/* Calendar Grid Cells (3 rows x 4 cols) skewed with face */}
        <g transform="matrix(0.99, -0.025, -0.14, 0.96, 52, 46)">
          {/* Row 1 */}
          <rect x="0" y="0" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <rect x="21" y="0" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <circle cx="29" cy="6.5" r="2.2" fill="#8B5CF6" />
          <rect x="42" y="0" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <rect x="63" y="0" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />

          {/* Row 2 */}
          <rect x="0" y="18" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <rect x="21" y="18" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <circle cx="29" cy="24.5" r="2.2" fill="#7C3AED" />
          <rect x="42" y="18" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <circle cx="50" cy="24.5" r="1.8" fill="#8B5CF6" />
          <rect x="63" y="18" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />

          {/* Row 3 */}
          <rect x="0" y="36" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <rect x="21" y="36" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
          <circle cx="29" cy="42.5" r="2.2" fill="#7C3AED" />
          <rect x="42" y="36" width="16" height="13" rx="3" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="1.2" />
        </g>

        {/* 5 Spiral Binder Holes + 3D Rings */}
        {[
          { x: 60, y: 31 },
          { x: 79, y: 30.2 },
          { x: 98, y: 29.4 },
          { x: 117, y: 28.6 },
          { x: 136, y: 27.8 },
        ].map((r, i) => (
          <g key={i}>
            <ellipse cx={r.x} cy={r.y + 2} rx="4.2" ry="3.2" fill="#4C1D95" />
            <path
              d={`M ${r.x - 1} ${r.y + 1.5} C ${r.x - 2} ${r.y - 12}, ${r.x + 9} ${r.y - 12}, ${r.x + 7} ${r.y - 1}`}
              stroke="url(#bk-ring)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d={`M ${r.x - 0.5} ${r.y} C ${r.x - 1} ${r.y - 10}, ${r.x + 7.5} ${r.y - 10}, ${r.x + 6} ${r.y - 2}`}
              stroke="#FFFFFF"
              strokeOpacity="0.7"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* 3D Checkmark Circle Badge */}
        <g filter="url(#bk-check-shadow)">
          <circle cx="115" cy="86" r="22" fill="#3B0764" />
          <circle cx="114" cy="84" r="22" fill="url(#bk-badge)" stroke="#C4B5FD" strokeWidth="1.2" />
          <path
            d="M104 84.5 L111 91.5 L125.5 76.5"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. CUSTOMERS - Three 3D Glossy User Busts                                  */
/* -------------------------------------------------------------------------- */
function CustomersArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="cu-shadow" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#072F6B" floodOpacity="0.42" />
        </filter>
        <filter id="cu-front-shadow" x="-25%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#06285E" floodOpacity="0.45" />
        </filter>

        {/* Center figure gradients */}
        <radialGradient id="cu-head-main" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="42%" stopColor="#E0F2FE" />
          <stop offset="78%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <radialGradient id="cu-body-main" cx="38%" cy="22%" r="75%">
          <stop offset="0%" stopColor="#F0F9FF" />
          <stop offset="40%" stopColor="#7DD3FC" />
          <stop offset="78%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>

        {/* Side figures gradients */}
        <radialGradient id="cu-head-side" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="48%" stopColor="#BAE6FD" />
          <stop offset="85%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0369A1" />
        </radialGradient>
        <radialGradient id="cu-body-side" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="45%" stopColor="#38BDF8" />
          <stop offset="85%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#075985" />
        </radialGradient>
      </defs>

      {/* Subtle ambient glow */}
      <ellipse cx="98" cy="108" rx="68" ry="18" fill="#072F6B" fillOpacity="0.28" />

      <g filter="url(#cu-shadow)">
        {/* Right background person */}
        <g>
          <circle cx="131" cy="48" r="16.5" fill="url(#cu-head-side)" />
          <path
            d="M104 95 C104 75.5 116 66.5 131 66.5 C146 66.5 158 75.5 158 95 C158 99.5 154.5 102 149 102 L113 102 C107.5 102 104 99.5 104 95 Z"
            fill="url(#cu-body-side)"
          />
        </g>

        {/* Left background person */}
        <g>
          <circle cx="57" cy="53" r="15.5" fill="url(#cu-head-side)" />
          <path
            d="M31 98 C31 79.5 42.5 71 57 71 C71.5 71 83 79.5 83 98 C83 102 79.5 104.5 74.5 104.5 L39.5 104.5 C34.5 104.5 31 102 31 98 Z"
            fill="url(#cu-body-side)"
          />
        </g>

        {/* Center foreground person */}
        <g filter="url(#cu-front-shadow)">
          <circle cx="92" cy="39" r="20.5" fill="url(#cu-head-main)" />
          <path
            d="M57 99 C57 74.5 71.5 62.5 92 62.5 C112.5 62.5 127 74.5 127 99 C127 104.5 122.5 108 116 108 L68 108 C61.5 108 57 104.5 57 99 Z"
            fill="url(#cu-body-main)"
          />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. SERVICES - 3D Spa Towels, Lotion Pump Bottle & Plumeria Flower          */
/* -------------------------------------------------------------------------- */
function ServicesArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="sv-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="#701A46" floodOpacity="0.42" />
        </filter>
        <filter id="sv-flower-sh" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#831843" floodOpacity="0.4" />
        </filter>

        <linearGradient id="sv-towel-top" x1="25" y1="45" x2="105" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FCE7F3" />
          <stop offset="85%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        <linearGradient id="sv-towel-bot" x1="25" y1="74" x2="102" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCE7F3" />
          <stop offset="50%" stopColor="#F9A8D4" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>

        <linearGradient id="sv-bottle" x1="100" y1="50" x2="144" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF1F2" />
          <stop offset="32%" stopColor="#FCE7F3" />
          <stop offset="70%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#BE185D" />
        </linearGradient>

        <linearGradient id="sv-neck" x1="112" y1="28" x2="132" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FBCFE8" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        <radialGradient id="sv-flower-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="55%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="92" cy="112" rx="68" ry="15" fill="#831843" fillOpacity="0.28" />

      <g filter="url(#sv-shadow)">
        {/* Bottom Stacked Spa Towel */}
        <path
          d="M24 85 C24 77 31 73 40 72 L94 66 C102 65 107 70 107 78 L107 95 C107 103 100 108 91 110 L62 114 C52 115 24 106 24 96 Z"
          fill="url(#sv-towel-bot)"
        />
        {/* Bottom towel inner roll fold */}
        <path
          d="M29 88 C29 84 34 82 40 84 L57 90 C61 91.5 61 97.5 57 98 L33 93 C30 92 29 90 29 88 Z"
          fill="#BE185D"
          fillOpacity="0.45"
        />
        <path
          d="M28 88 C29 84 34 83 41 85 L57 91"
          stroke="#FDF2F8"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Top Stacked Spa Towel */}
        <path
          d="M25 60 C25 52 33 47 45 45 L88 40 C99 39 107 45 107 55 L107 70 C107 79 99 84 88 86 L60 90 C48 91 25 81 25 71 Z"
          fill="url(#sv-towel-top)"
        />
        {/* Top towel inner roll fold */}
        <path
          d="M31 64 C31 59 36 57 43 59 L59 65 C63 66.5 63 73 58 74 L35 69 C32 68 31 66 31 64 Z"
          fill="#DB2777"
          fillOpacity="0.42"
        />
        <path
          d="M30 63.5 C31 59.5 36 58.5 43 60.5 L59 66.5"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* 3D Lotion Pump Bottle */}
        <g>
          {/* Pump nozzle */}
          <path
            d="M104 16.5 C112 14.5 125 14.5 135 18.5 C137 19.5 136 22.5 133 21.8 C125 19.5 114 19.5 104 20.5 C101.5 20.8 101.5 17.2 104 16.5 Z"
            fill="url(#sv-neck)"
          />
          {/* Pump stem */}
          <rect x="118.5" y="19" width="7" height="9" rx="2" fill="url(#sv-neck)" />
          {/* Ribbed bottle collar */}
          <rect x="113" y="27" width="18" height="13" rx="3.5" fill="url(#sv-neck)" />
          <line x1="113" y1="33.5" x2="131" y2="33.5" stroke="#F472B6" strokeWidth="1" strokeOpacity="0.5" />

          {/* Main Bottle Body */}
          <path
            d="M101 55 C101 44 109 39 122 39 C135 39 143 44 143 55 L143 97 C143 103 136 107 122 107 C108 107 101 103 101 97 Z"
            fill="url(#sv-bottle)"
          />
          {/* Bottle vertical specular highlight */}
          <path
            d="M108 49 C108 45 112 43 115 43 L115 100 C111 100 108 98 108 94 Z"
            fill="#FFFFFF"
            fillOpacity="0.38"
          />
        </g>

        {/* 3D 5-Petal White Plumeria Flower */}
        <g filter="url(#sv-flower-sh)" transform="translate(91, 93)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <ellipse
                cx="0"
                cy="-12.5"
                rx="8.2"
                ry="12.5"
                transform="rotate(12 0 -12.5)"
                fill="#FFFFFF"
              />
              <ellipse
                cx="1.5"
                cy="-11.5"
                rx="6.2"
                ry="10"
                transform="rotate(12 1.5 -11.5)"
                fill="#FFF1F2"
              />
            </g>
          ))}
          <circle cx="0" cy="0" r="9.5" fill="url(#sv-flower-center)" />
          <circle cx="0" cy="0" r="4" fill="#F59E0B" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. STAFF / STYLISTS - 3D Black Leather & Chrome Salon Barber Chair         */
/* -------------------------------------------------------------------------- */
function StaffArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="st-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#7C2D12" floodOpacity="0.42" />
        </filter>

        <linearGradient id="st-leather-back" x1="70" y1="25" x2="128" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="28%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>

        <linearGradient id="st-leather-seat" x1="42" y1="66" x2="112" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="35%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>

        <linearGradient id="st-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E2E8F0" />
          <stop offset="68%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="st-base" x1="55" y1="118" x2="122" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="28%" stopColor="#F8FAFC" />
          <stop offset="52%" stopColor="#334155" />
          <stop offset="78%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <ellipse cx="86" cy="128" rx="46" ry="9" fill="#7C2D12" fillOpacity="0.35" />

      <g filter="url(#st-shadow)">
        {/* Chrome Base Disc */}
        <ellipse cx="88" cy="124" rx="34" ry="7.5" fill="url(#st-base)" stroke="#E2E8F0" strokeWidth="0.8" />
        <path d="M74 123 L85 114 L91 114 L102 123 Z" fill="url(#st-chrome)" />

        {/* Hydraulic Pump Lever */}
        <path d="M92 98 L112 103" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />

        {/* Hydraulic Center Column */}
        <rect x="83.5" y="92" width="9" height="25" rx="2" fill="url(#st-chrome)" />

        {/* Back Left Armrest Chrome Support */}
        <path d="M51 54 L51 74" stroke="url(#st-chrome)" strokeWidth="4" strokeLinecap="round" />

        {/* Backrest Cushion */}
        <path
          d="M84 31 C84 26.5 88 23.5 93 23.5 L125 24.5 C130 24.5 133.5 28 132.5 33 L126 73 C125 77.5 121 80 116 80 L81 78 C76.5 78 74 74 75 69.5 Z"
          fill="url(#st-leather-back)"
          stroke="#334155"
          strokeWidth="0.8"
        />
        {/* Vertical leather stitching lines on backrest */}
        <line x1="96" y1="26" x2="89" y2="75" stroke="#0F172A" strokeWidth="1.6" />
        <line x1="112" y1="26.5" x2="105" y2="76" stroke="#0F172A" strokeWidth="1.6" />

        {/* Headrest Stem + Padded Headrest */}
        <rect x="102" y="18" width="4" height="7" fill="url(#st-chrome)" />
        <rect x="112" y="18" width="4" height="7" fill="url(#st-chrome)" />
        <rect
          x="95"
          y="9"
          width="33"
          height="12"
          rx="4.5"
          fill="url(#st-leather-back)"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Left Armrest Pad */}
        <path
          d="M44 51 L80 50 C83 50 84 54.5 80 55 L44 56 C40 56 40 51 44 51 Z"
          fill="url(#st-leather-seat)"
        />
        <rect x="42" y="51.5" width="7" height="4" rx="2" fill="#F8FAFC" />

        {/* Plush Seat Cushion */}
        <path
          d="M45 73 C45 68 51 65 59 65 L112 66 C118 66 122 70 121 76 L119 86 C118 90 113 92 106 92 L50 88 C44 87.5 42 83 43 78 Z"
          fill="url(#st-leather-seat)"
          stroke="#334155"
          strokeWidth="0.8"
        />

        {/* Chrome Side Frame & Right Armrest */}
        <path
          d="M84 91 L115 86 C121 85 124 81 125 74 L128 57 L102 57 L99 88"
          stroke="url(#st-chrome)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right Armrest Black Leather Top Pad */}
        <path
          d="M95 53.5 L131 53 C135 53 135 58.5 131 58.5 L95 59 C91 59 91 53.5 95 53.5 Z"
          fill="url(#st-leather-back)"
        />
        <rect x="92" y="54" width="8" height="4.5" rx="2" fill="#FFFFFF" />

        {/* Chrome Footrest Assembly */}
        <path d="M51 87 L42 112" stroke="url(#st-chrome)" strokeWidth="3.8" strokeLinecap="round" />
        <path d="M81 90 L70 117" stroke="url(#st-chrome)" strokeWidth="4.2" strokeLinecap="round" />
        {/* Footplate */}
        <path
          d="M24 111 L46 106 L72 115 L52 121 Z"
          fill="url(#st-chrome)"
          stroke="#475569"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. INVENTORY - Two 3D Isometric Kraft Cardboard Boxes                      */
/* -------------------------------------------------------------------------- */
function InventoryArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="in-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#064E3B" floodOpacity="0.45" />
        </filter>
        <filter id="in-front-sh" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#064E3B" floodOpacity="0.4" />
        </filter>

        <linearGradient id="in-top" x1="48" y1="12" x2="138" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="55%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="in-left" x1="48" y1="30" x2="96" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="55%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="in-right" x1="94" y1="35" x2="144" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#653208" />
        </linearGradient>

        <linearGradient id="in-sm-top" x1="20" y1="58" x2="102" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="60%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="in-sm-left" x1="20" y1="70" x2="66" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#9A5B13" />
        </linearGradient>
        <linearGradient id="in-sm-right" x1="62" y1="75" x2="106" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#5C2D0C" />
        </linearGradient>
      </defs>

      <g filter="url(#in-shadow)">
        {/* ==================== LARGE BACK BOX ==================== */}
        <g>
          {/* Top Face */}
          <polygon points="92,13 142,29 94,47 46,29" fill="url(#in-top)" />
          {/* Left Face */}
          <polygon points="46,29 94,47 94,102 46,82" fill="url(#in-left)" />
          {/* Right Face */}
          <polygon points="94,47 142,29 142,84 94,102" fill="url(#in-right)" />

          {/* Cross Packing Tape on Large Box */}
          <polygon points="67,21 76,18 124,35.5 115,39" fill="#B45309" fillOpacity="0.45" />
          <polygon points="113,20 122,23 75,40 66,36.5" fill="#B45309" fillOpacity="0.42" />
          {/* Tape flaps down sides */}
          <polygon points="66,36.5 75,40 75,61 66,57.5" fill="#78350F" fillOpacity="0.48" />
          <polygon points="115,39 124,35.5 124,57 115,60.5" fill="#451A03" fillOpacity="0.45" />

          {/* Crisp specular edge highlight */}
          <polyline
            points="46,29 94,47 142,29"
            stroke="#FEF9C3"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line x1="94" y1="47" x2="94" y2="102" stroke="#FEF3C7" strokeWidth="1" strokeOpacity="0.45" />
        </g>

        {/* ==================== SMALL FRONT BOX ==================== */}
        <g filter="url(#in-front-sh)">
          {/* Top Face */}
          <polygon points="62,56 105,70 62,86 20,70" fill="url(#in-sm-top)" />
          {/* Left Face */}
          <polygon points="20,70 62,86 62,123 20,106" fill="url(#in-sm-left)" />
          {/* Right Face */}
          <polygon points="62,86 105,70 105,107 62,123" fill="url(#in-sm-right)" />

          {/* Cross Packing Tape on Small Box */}
          <polygon points="39,63 47,60 89,75.5 81,78.5" fill="#B45309" fillOpacity="0.45" />
          <polygon points="80,62 88,64.8 46,80 38,77" fill="#B45309" fillOpacity="0.42" />
          {/* Tape flaps down sides */}
          <polygon points="38,77 46,80 46,97 38,94" fill="#78350F" fillOpacity="0.48" />
          <polygon points="81,78.5 89,75.5 89,93 81,96" fill="#451A03" fillOpacity="0.45" />

          {/* Crisp specular edge highlight */}
          <polyline
            points="20,70 62,86 105,70"
            stroke="#FEF9C3"
            strokeWidth="1.2"
            strokeOpacity="0.75"
          />
          <line x1="62" y1="86" x2="62" y2="123" stroke="#FEF3C7" strokeWidth="1" strokeOpacity="0.45" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. SALES & PAYMENTS - 3D POS Card Terminal + Receipt                       */
/* -------------------------------------------------------------------------- */
function SalesArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="sa-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#042F40" floodOpacity="0.48" />
        </filter>

        <linearGradient id="sa-body-top" x1="35" y1="28" x2="140" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="45%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        <linearGradient id="sa-body-side" x1="25" y1="78" x2="155" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        <linearGradient id="sa-receipt" x1="82" y1="10" x2="132" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="sa-screen" x1="65" y1="36" x2="112" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>

      <g filter="url(#sa-shadow)">
        {/* 3D POS Terminal Lower/Side Extrusion */}
        <path
          d="M72 28 C77 21 86 19 95 21 L146 31 C155 33 159 42 154 51 L115 110 C110 118 100 121 90 119 L34 106 C25 104 22 95 27 87 L29 74 Z"
          fill="url(#sa-body-side)"
        />

        {/* 3D POS Terminal Top Face */}
        <path
          d="M70 24 C75 18 84 16 93 18 L140 27 C148 29 151 37 146 44 L107 98 C102 105 93 108 83 106 L33 94 C25 92 23 84 28 77 Z"
          fill="url(#sa-body-top)"
          stroke="#64748B"
          strokeWidth="1"
        />

        {/* Card Reader Slot on Bottom Front Bevel */}
        <line
          x1="36"
          y1="99"
          x2="82"
          y2="110"
          stroke="#020617"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <line
          x1="37"
          y1="100.5"
          x2="81"
          y2="111"
          stroke="#38BDF8"
          strokeWidth="0.9"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />

        {/* Glowing Display Screen */}
        <polygon
          points="72,33 118,42 107,56 61,47"
          fill="url(#sa-screen)"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Curled Paper Receipt Emerging from Printer Slot */}
        <path
          d="M138 14 C146 16 149 24 144 33 L132 30 C135 22 135 16 138 14 Z"
          fill="#94A3B8"
        />
        <path
          d="M70 48 C77 32 84 16 96 10 L139 15 C128 21 121 37 113 56 Z"
          fill="url(#sa-receipt)"
        />
        {/* Printed receipt lines */}
        <line x1="94" y1="19" x2="122" y2="23" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="90" y1="26" x2="119" y2="30" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="86" y1="32" x2="114" y2="36" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="83" y1="38" x2="106" y2="41.5" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="79" y1="44" x2="108" y2="48.5" stroke="#334155" strokeWidth="2.2" strokeLinecap="round" />

        {/* 3x3 Numeric Keypad + 1 Green Promo Key + 3 Colored Bottom Keys */}
        {/* Row 1 keys */}
        <polygon points="56,53 69,55.5 64,62 51,59.5" rx="2" fill="#CBD5E1" />
        <polygon points="74,56.5 87,59 82,65.5 69,63" fill="#CBD5E1" />
        <polygon points="92,60 106,63 101,69.5 87,66.5" fill="#D9F99D" />

        {/* Row 2 keys */}
        <polygon points="49,63 62,65.5 57,72 44,69.5" fill="#CBD5E1" />
        <polygon points="67,66.5 80,69 75,75.5 62,73" fill="#CBD5E1" />
        <polygon points="85,70 99,73 94,79.5 80,76.5" fill="#CBD5E1" />

        {/* Row 3 Action Keys: Red, Yellow, Green */}
        <polygon points="41,73.5 55,76.5 49.5,84 35.5,81" fill="#EF4444" />
        <polygon points="59,77.2 73,80.2 67.5,87.7 53.5,84.7" fill="#FACC15" />
        <polygon points="77.5,81 92,84 86.5,91.5 72,88.5" fill="#22C55E" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. REPORTS - 3D Ascending Bar Chart + Glowing Growth Arrow                 */
/* -------------------------------------------------------------------------- */
function ReportsArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="rp-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#78350F" floodOpacity="0.38" />
        </filter>
        <filter id="rp-arrow-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#92400E" floodOpacity="0.42" />
        </filter>

        <linearGradient id="rp-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FEF3C7" />
          <stop offset="80%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        <linearGradient id="rp-arrow" x1="30" y1="48" x2="138" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
          <stop offset="45%" stopColor="#FEF9C3" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      {/* Subtle golden wave glow */}
      <circle cx="115" cy="70" r="65" fill="#FEF08A" fillOpacity="0.14" />

      {/* Upward Trend Curve + Arrowhead */}
      <g filter="url(#rp-arrow-glow)">
        <path
          d="M28 52 C48 42, 66 47, 88 39 C105 33, 118 24, 129 15"
          stroke="url(#rp-arrow)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <polygon points="138,9 121,12 132,25" fill="#FFFFFF" />
      </g>

      {/* 4 Ascending 3D Bar Columns */}
      <g filter="url(#rp-shadow)">
        {/* Bar 1 */}
        <rect x="30" y="64" width="21" height="33" rx="5" fill="#D97706" fillOpacity="0.45" />
        <rect x="29" y="61" width="21" height="33" rx="5" fill="url(#rp-bar)" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Bar 2 */}
        <rect x="59" y="54" width="21" height="43" rx="5" fill="#D97706" fillOpacity="0.45" />
        <rect x="58" y="51" width="21" height="43" rx="5" fill="url(#rp-bar)" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Bar 3 */}
        <rect x="88" y="44" width="21" height="53" rx="5" fill="#D97706" fillOpacity="0.45" />
        <rect x="87" y="41" width="21" height="53" rx="5" fill="url(#rp-bar)" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Bar 4 */}
        <rect x="117" y="33" width="21" height="64" rx="5" fill="#D97706" fillOpacity="0.45" />
        <rect x="116" y="30" width="21" height="64" rx="5" fill="url(#rp-bar)" stroke="#FFFFFF" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. SETTINGS - Two Interlocking 3D Lavender/White Gears                     */
/* -------------------------------------------------------------------------- */
function createGearPath(
  cx: number,
  cy: number,
  teeth: number,
  rOuter: number,
  rInner: number,
  rHole: number,
  rotDeg = 0
): string {
  const step = (Math.PI * 2) / teeth;
  const rot = (rotDeg * Math.PI) / 180;
  const pts: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const a = i * step + rot;
    const a1 = a - step * 0.28;
    const a2 = a - step * 0.14;
    const a3 = a + step * 0.14;
    const a4 = a + step * 0.28;

    const p1x = (cx + Math.cos(a1) * rInner).toFixed(2);
    const p1y = (cy + Math.sin(a1) * rInner).toFixed(2);
    const p2x = (cx + Math.cos(a2) * rOuter).toFixed(2);
    const p2y = (cy + Math.sin(a2) * rOuter).toFixed(2);
    const p3x = (cx + Math.cos(a3) * rOuter).toFixed(2);
    const p3y = (cy + Math.sin(a3) * rOuter).toFixed(2);
    const p4x = (cx + Math.cos(a4) * rInner).toFixed(2);
    const p4y = (cy + Math.sin(a4) * rInner).toFixed(2);

    if (i === 0) {
      pts.push(`M ${p1x} ${p1y}`);
    } else {
      pts.push(`L ${p1x} ${p1y}`);
    }
    pts.push(`L ${p2x} ${p2y}`, `L ${p3x} ${p3y}`, `L ${p4x} ${p4y}`);
  }
  pts.push("Z");

  // Inner axle hole (counter-clockwise for fill-rule="evenodd")
  pts.push(
    `M ${(cx + rHole).toFixed(2)} ${cy.toFixed(2)}`,
    `A ${rHole} ${rHole} 0 1 0 ${(cx - rHole).toFixed(2)} ${cy.toFixed(2)}`,
    `A ${rHole} ${rHole} 0 1 0 ${(cx + rHole).toFixed(2)} ${cy.toFixed(2)}`,
    "Z"
  );

  return pts.join(" ");
}

const BIG_GEAR_BACK = createGearPath(62, 69, 8, 34, 25, 11, 12);
const BIG_GEAR_FRONT = createGearPath(59, 65, 8, 34, 25, 11, 12);

const SMALL_GEAR_BACK = createGearPath(108, 39, 8, 24, 17.5, 7.5, 34);
const SMALL_GEAR_FRONT = createGearPath(105, 36, 8, 24, 17.5, 7.5, 34);

function SettingsArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="se-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="6" floodColor="#2E1065" floodOpacity="0.45" />
        </filter>

        <linearGradient id="se-front-big" x1="30" y1="34" x2="90" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#EDE9FE" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>

        <linearGradient id="se-front-sm" x1="82" y1="14" x2="128" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#EDE9FE" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>

        <linearGradient id="se-rim" x1="30" y1="30" x2="120" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>

        <linearGradient id="se-well" x1="40" y1="45" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#F5F3FF" />
        </linearGradient>
      </defs>

      <circle cx="95" cy="65" r="64" fill="#A855F7" fillOpacity="0.16" />

      <g filter="url(#se-shadow)">
        {/* ==================== SMALL TOP-RIGHT GEAR ==================== */}
        <g>
          <path d={SMALL_GEAR_BACK} fill="url(#se-rim)" fillRule="evenodd" />
          <path
            d={SMALL_GEAR_FRONT}
            fill="url(#se-front-sm)"
            fillRule="evenodd"
            stroke="#FFFFFF"
            strokeWidth="0.7"
          />
          <circle
            cx="105"
            cy="36"
            r="12"
            stroke="#C4B5FD"
            strokeWidth="2.2"
            fill="none"
          />
        </g>

        {/* ==================== LARGE BOTTOM-LEFT GEAR ==================== */}
        <g>
          <path d={BIG_GEAR_BACK} fill="url(#se-rim)" fillRule="evenodd" />
          <path
            d={BIG_GEAR_FRONT}
            fill="url(#se-front-big)"
            fillRule="evenodd"
            stroke="#FFFFFF"
            strokeWidth="0.8"
          />
          {/* Inner recessed 3D ring */}
          <circle
            cx="59"
            cy="65"
            r="17.5"
            stroke="url(#se-well)"
            strokeWidth="3.5"
            fill="none"
          />
        </g>
      </g>
    </svg>
  );
}

