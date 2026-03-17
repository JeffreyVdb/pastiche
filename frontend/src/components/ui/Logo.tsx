interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { font: "16px", bracket: "14px", gap: "6px" },
  md: { font: "20px", bracket: "18px", gap: "8px" },
  lg: { font: "28px", bracket: "24px", gap: "10px" },
};

export function Logo({ size = "md" }: LogoProps) {
  const s = sizes[size];
  return (
    <span
      aria-label="Pastiche"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: s.gap,
        userSelect: "none",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: s.bracket,
          color: "var(--color-accent)",
          fontWeight: 400,
          letterSpacing: "-0.02em",
          opacity: 0.8,
        }}
      >
        {"//"}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: s.font,
          fontWeight: 600,
          color: "var(--color-text)",
          letterSpacing: "-0.04em",
        }}
      >
        pastiche
      </span>
    </span>
  );
}
