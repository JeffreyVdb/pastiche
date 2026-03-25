import type { CSSProperties } from "react";

export type SnippetColorKey = "red" | "orange" | "green" | "blue" | "purple";

export const SNIPPET_COLORS: Record<
  SnippetColorKey,
  {
    label: string;
    swatch: string;
    light: { bg: string; border: string };
    dark: { bg: string; border: string };
  }
> = {
  red: {
    label: "Red",
    swatch: "#ef4444",
    light: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.25)" },
    dark: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
  },
  orange: {
    label: "Orange",
    swatch: "#f97316",
    light: { bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.25)" },
    dark: { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)" },
  },
  green: {
    label: "Green",
    swatch: "#22c55e",
    light: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.25)" },
    dark: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" },
  },
  blue: {
    label: "Blue",
    swatch: "#3b82f6",
    light: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)" },
    dark: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" },
  },
  purple: {
    label: "Purple",
    swatch: "#a855f7",
    light: { bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.25)" },
    dark: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.25)" },
  },
};

export const SNIPPET_COLOR_KEYS: SnippetColorKey[] = [
  "red",
  "orange",
  "green",
  "blue",
  "purple",
];

export function getSnippetColorStyle(
  color: string | null | undefined,
  resolved: "light" | "dark"
): CSSProperties {
  if (!color || !(color in SNIPPET_COLORS)) return {};
  const palette = SNIPPET_COLORS[color as SnippetColorKey][resolved];
  return { background: palette.bg, borderColor: palette.border };
}
