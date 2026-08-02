/** Subtle, brand-colored curves for otherwise-empty status screens (confirmation, cancellation). Purely decorative. */
export function DecorativeBackground() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 -z-10 size-full text-primary"
    >
      <circle cx="780" cy="40" r="130" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.16" />
      <circle cx="780" cy="40" r="190" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
      <circle cx="780" cy="40" r="250" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.06" />
      <circle cx="10" cy="790" r="100" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.16" />
      <circle cx="10" cy="790" r="160" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.1" />
      <path
        d="M -80 560 Q 220 460 420 560 T 880 520"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.12"
      />
      <path
        d="M -80 640 Q 240 570 460 650 T 880 610"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.07"
      />
    </svg>
  );
}
