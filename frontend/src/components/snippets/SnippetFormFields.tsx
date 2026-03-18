import { useState } from "react";

export const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-text)",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export function FocusInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inputBase, borderColor: focused ? "var(--color-accent)" : "var(--color-border)", ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

export function FocusSelect({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{ ...inputBase, borderColor: focused ? "var(--color-accent)" : "var(--color-border)", cursor: "pointer", ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

export function FocusTextarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...inputBase,
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        lineHeight: 1.65,
        minHeight: "300px",
        resize: "vertical",
        borderColor: focused ? "var(--color-accent)" : "var(--color-border)",
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}
