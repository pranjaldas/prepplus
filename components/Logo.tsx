interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  light?: boolean;
  className?: string;
}

/** PrepPulse mark: a pulse waveform that resolves into a checkmark, inside a rounded square. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PrepPulse logo"
      className={className}
    >
      <defs>
        <linearGradient id="pp-pulse" x1="6" y1="24" x2="42" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#1E1B4B" />
      <polyline
        points="7,26 14,26 17.5,18 22,33 26,24 30,30 41,14"
        stroke="url(#pp-pulse)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ size = 36, withWordmark = true, light = false, className }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
        >
          Prep<span className="text-primary">Pulse</span>
        </span>
      )}
    </span>
  );
}
