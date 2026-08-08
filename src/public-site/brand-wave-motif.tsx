import type { CSSProperties } from "react";

const lineIndexes = [0, 1, 2, 3, 4, 5, 6] as const;
const barIndexes = [0, 1, 2, 3, 4] as const;

export function BrandWaveMotif({
  compact = false,
  dark = false,
  className = "",
}: Readonly<{
  compact?: boolean;
  dark?: boolean;
  className?: string;
}>) {
  const classes = [
    "brand-wave",
    compact ? "brand-wave--compact" : "",
    dark ? "brand-wave--dark" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div aria-hidden="true" className={classes} data-brand-wave="true">
      <span className="brand-wave__orb brand-wave__orb--green" />
      <span className="brand-wave__orb brand-wave__orb--blue" />
      {lineIndexes.map((index) => (
        <span
          className="brand-wave__line"
          key={`line-${index}`}
          style={{
            "--wave-y": `${index * 1.18}rem`,
            "--wave-compact-y": `${index * 0.85}rem`,
            "--wave-shrink": `${index * 1.2}%`,
            "--wave-height": `${index * 0.35}rem`,
            "--wave-compact-height": `${index * 0.2}rem`,
            "--wave-opacity": 0.95 - index * 0.08,
          } as CSSProperties}
        />
      ))}
      {barIndexes.map((index) => (
        <span
          className="brand-wave__bar"
          key={`bar-${index}`}
          style={{ "--bar-offset": `${index * 0.82}rem` } as CSSProperties}
        />
      ))}
    </div>
  );
}
