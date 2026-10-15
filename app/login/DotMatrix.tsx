"use client";

interface AcademicGridProps {
  className?: string;
}

export default function AcademicGrid({ className = "w-36 h-36" }: AcademicGridProps) {
  return (
    <svg
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Architectural Linear Grid */}
        <pattern
          id="archGrid"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 14 0 L 0 0 0 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeOpacity="0.18"
          />
        </pattern>
      </defs>

      {/* Base Grid Blueprint Background */}
      <rect width="140" height="140" fill="url(#archGrid)" />

      {/* Isometric Institutional Foundation Lines (A-Frame / Knowledge Pillar) */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        {/* Outer Prism Anchor */}
        <path
          d="M 70 15 L 120 44 V 96 L 70 125 L 20 96 V 44 Z"
          strokeWidth="1.2"
          strokeDasharray="4 2"
          strokeOpacity="0.4"
        />

        {/* Interlocking Pillars / Institutional Apex */}
        <path
          d="M 70 25 L 105 45 V 85 L 70 105 L 35 85 V 45 Z"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />

        {/* Structural Ribs & Cross-Sections */}
        <path d="M 70 25 V 105" strokeWidth="1" strokeOpacity="0.5" />
        <path d="M 35 45 L 105 85" strokeWidth="0.8" strokeOpacity="0.3" />
        <path d="M 105 45 L 35 85" strokeWidth="0.8" strokeOpacity="0.3" />

        {/* Ascending Chevron Accents (Signifying Career Advancement) */}
        <path d="M 50 68 L 70 56 L 90 68" strokeWidth="2" strokeOpacity="0.9" />
        <path d="M 56 78 L 70 70 L 84 78" strokeWidth="1.5" strokeOpacity="0.7" />
      </g>

      {/* Precision Node Markers */}
      <g fill="currentColor" opacity="0.75">
        <rect x="68" y="23" width="4" height="4" transform="rotate(45 70 25)" />
        <rect x="103" y="43" width="4" height="4" transform="rotate(45 105 45)" />
        <rect x="33" y="43" width="4" height="4" transform="rotate(45 35 45)" />
        <rect x="68" y="103" width="4" height="4" transform="rotate(45 70 105)" />
      </g>
    </svg>
  );
}