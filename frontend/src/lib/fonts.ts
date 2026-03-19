export interface AppFont {
  id: string;
  label: string;
  family: string;
  googleFamily: string;
  fallback: string;
}

export const CODE_FONTS: AppFont[] = [
  { id: "jetbrains-mono", label: "JetBrains Mono", family: "JetBrains Mono", googleFamily: "JetBrains+Mono:ital,wght@0,100..800;1,100..800", fallback: "monospace" },
  { id: "fira-code", label: "Fira Code", family: "Fira Code", googleFamily: "Fira+Code:wght@300..700", fallback: "monospace" },
  { id: "source-code-pro", label: "Source Code Pro", family: "Source Code Pro", googleFamily: "Source+Code+Pro:ital,wght@0,200..900;1,200..900", fallback: "monospace" },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", family: "IBM Plex Mono", googleFamily: "IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700", fallback: "monospace" },
  { id: "inconsolata", label: "Inconsolata", family: "Inconsolata", googleFamily: "Inconsolata:wght@200..900", fallback: "monospace" },
  { id: "victor-mono", label: "Victor Mono", family: "Victor Mono", googleFamily: "Victor+Mono:ital,wght@0,100..700;1,100..700", fallback: "monospace" },
  { id: "space-mono", label: "Space Mono", family: "Space Mono", googleFamily: "Space+Mono:ital,wght@0,400;0,700;1,400;1,700", fallback: "monospace" },
  { id: "ubuntu-mono", label: "Ubuntu Mono", family: "Ubuntu Mono", googleFamily: "Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700", fallback: "monospace" },
];

export const MARKDOWN_FONTS: AppFont[] = [
  { id: "ubuntu", label: "Ubuntu", family: "Ubuntu", googleFamily: "Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700", fallback: "sans-serif" },
  { id: "inter", label: "Inter", family: "Inter", googleFamily: "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", fallback: "sans-serif" },
  { id: "lora", label: "Lora", family: "Lora", googleFamily: "Lora:ital,wght@0,400..700;1,400..700", fallback: "serif" },
  { id: "merriweather", label: "Merriweather", family: "Merriweather", googleFamily: "Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900", fallback: "serif" },
  { id: "nunito", label: "Nunito", family: "Nunito", googleFamily: "Nunito:ital,wght@0,200..1000;1,200..1000", fallback: "sans-serif" },
  { id: "source-serif-4", label: "Source Serif 4", family: "Source Serif 4", googleFamily: "Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900", fallback: "serif" },
  { id: "literata", label: "Literata", family: "Literata", googleFamily: "Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900", fallback: "serif" },
];

export const DEFAULT_CODE_FONT_ID = "jetbrains-mono";
export const DEFAULT_MARKDOWN_FONT_ID = "ubuntu";

export const DEFAULT_CODE_FONT_SIZE = 13;
export const DEFAULT_MARKDOWN_FONT_SIZE = 15;
export const CODE_FONT_SIZE_MIN = 10;
export const CODE_FONT_SIZE_MAX = 24;
export const MARKDOWN_FONT_SIZE_MIN = 12;
export const MARKDOWN_FONT_SIZE_MAX = 26;
export const FONT_SIZE_STEP = 1;

export function getFontById(fonts: AppFont[], id: string): AppFont {
  return fonts.find((f) => f.id === id) ?? fonts[0];
}

export function fontCssValue(font: AppFont): string {
  return `"${font.family}", ${font.fallback}`;
}

export function buildGoogleFontsUrl(fonts: AppFont[]): string {
  const families = fonts.map((f) => `family=${f.googleFamily}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

const loadedFonts = new Set<string>();

export function ensureFontLoaded(font: AppFont): void {
  if (loadedFonts.has(font.id)) return;
  loadedFonts.add(font.id);

  // JetBrains Mono is loaded via index.html; Ubuntu is loaded as well
  if (font.id === "jetbrains-mono" || font.id === "ubuntu") return;

  const url = buildGoogleFontsUrl([font]);
  const existing = document.querySelector(`link[data-font="${font.id}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-font", font.id);
  document.head.appendChild(link);
}
