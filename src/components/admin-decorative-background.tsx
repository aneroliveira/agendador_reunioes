/**
 * Subtle, brand-colored decoration for the admin dashboard — outline-only
 * shapes (nested hexagons + a loose constellation of connected dots, plus a
 * tiny clock nod to the scheduling theme), distinct from the public-facing
 * `DecorativeBackground` (circles/curves) so the admin area reads as its
 * own space. Purely decorative.
 */
export function AdminDecorativeBackground() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 -z-10 size-full text-primary"
    >
      {/* Nested hexagons, top-left */}
      <polygon
        points="160,130 125,191 55,191 20,130 55,69 125,69"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.14"
      />
      <polygon
        points="190,130 140,217 40,217 -10,130 40,43 140,43"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.07"
      />

      {/* Nested hexagons, bottom-right */}
      <polygon
        points="810,720 765,798 675,798 630,720 675,642 765,642"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <polygon
        points="775,720 748,768 693,768 665,720 693,672 748,672"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.06"
      />

      {/* A loose constellation, mid-right */}
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1">
        <path d="M 620 220 L 680 260 L 740 230" />
        <path d="M 680 260 L 700 320 L 650 400" />
        <path d="M 700 320 L 600 340 L 560 280 L 620 220" />
      </g>
      <g fill="currentColor" opacity="0.16">
        <circle cx="620" cy="220" r="3.5" />
        <circle cx="680" cy="260" r="3.5" />
        <circle cx="740" cy="230" r="3" />
        <circle cx="700" cy="320" r="3" />
        <circle cx="650" cy="400" r="3.5" />
        <circle cx="600" cy="340" r="3" />
        <circle cx="560" cy="280" r="3" />
      </g>

      {/* A tiny clock, bottom-left */}
      <circle cx="70" cy="650" r="42" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
      <path d="M 70 650 L 70 622" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
      <path d="M 70 650 L 92 662" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
    </svg>
  );
}
