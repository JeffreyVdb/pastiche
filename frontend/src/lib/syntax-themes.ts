import gruvboxDark from "react-syntax-highlighter/dist/esm/styles/hljs/gruvbox-dark";
import gruvboxLight from "react-syntax-highlighter/dist/esm/styles/hljs/gruvbox-light";
import github from "react-syntax-highlighter/dist/esm/styles/hljs/github";
import dracula from "react-syntax-highlighter/dist/esm/styles/hljs/dracula";
import nord from "react-syntax-highlighter/dist/esm/styles/hljs/nord";
import nightOwl from "react-syntax-highlighter/dist/esm/styles/hljs/night-owl";
import solarizedLight from "react-syntax-highlighter/dist/esm/styles/hljs/solarized-light";
import solarizedDark from "react-syntax-highlighter/dist/esm/styles/hljs/solarized-dark";

export interface AppColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  accentHover: string;
}

export interface SyntaxTheme {
  id: string;
  label: string;
  category: "dark" | "light";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hljs: { [key: string]: any };
  appColors: AppColors;
}

export const SYNTAX_THEMES: SyntaxTheme[] = [
  {
    id: "gruvbox-dark",
    label: "Gruvbox Dark",
    category: "dark",
    hljs: gruvboxDark,
    appColors: {
      bg: "#282828",
      surface: "#32302f",
      surface2: "#3c3836",
      border: "#504945",
      text: "#ebdbb2",
      textMuted: "#928374",
      accent: "#8ec07c",
      accentDim: "#8ec07c26",
      accentHover: "#b8bb26",
    },
  },
  {
    id: "gruvbox-light",
    label: "Gruvbox Light",
    category: "light",
    hljs: gruvboxLight,
    appColors: {
      bg: "#f9f5d7",
      surface: "#fbf1c7",
      surface2: "#f2e5bc",
      border: "#d5c4a1",
      text: "#3c3836",
      textMuted: "#7c6f64",
      accent: "#427b58",
      accentDim: "#427b5826",
      accentHover: "#79740e",
    },
  },
  {
    id: "github",
    label: "Github",
    category: "light",
    hljs: github,
    appColors: {
      bg: "#f6f8fa",
      surface: "#ffffff",
      surface2: "#eaeef2",
      border: "#d0d7de",
      text: "#1f2328",
      textMuted: "#636c76",
      accent: "#0550ae",
      accentDim: "#0550ae26",
      accentHover: "#003d8a",
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    category: "dark",
    hljs: dracula,
    appColors: {
      bg: "#282a36",
      surface: "#1e1f29",
      surface2: "#44475a",
      border: "#6272a4",
      text: "#f8f8f2",
      textMuted: "#6272a4",
      accent: "#bd93f9",
      accentDim: "#bd93f926",
      accentHover: "#ff79c6",
    },
  },
  {
    id: "nord",
    label: "Nord",
    category: "dark",
    hljs: nord,
    appColors: {
      bg: "#2e3440",
      surface: "#3b4252",
      surface2: "#434c5e",
      border: "#4c566a",
      text: "#eceff4",
      textMuted: "#d8dee9",
      accent: "#88c0d0",
      accentDim: "#88c0d026",
      accentHover: "#81b8cf",
    },
  },
  {
    id: "night-owl",
    label: "Night Owl",
    category: "dark",
    hljs: nightOwl,
    appColors: {
      bg: "#011627",
      surface: "#01111d",
      surface2: "#0d2d44",
      border: "#1d3b53",
      text: "#d6deeb",
      textMuted: "#5f7e97",
      accent: "#82aaff",
      accentDim: "#82aaff26",
      accentHover: "#addb67",
    },
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    category: "light",
    hljs: solarizedLight,
    appColors: {
      bg: "#fdf6e3",
      surface: "#eee8d5",
      surface2: "#e5ded5",
      border: "#ccc4b8",
      text: "#657b83",
      textMuted: "#839496",
      accent: "#268bd2",
      accentDim: "#268bd226",
      accentHover: "#2aa198",
    },
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    category: "dark",
    hljs: solarizedDark,
    appColors: {
      bg: "#002b36",
      surface: "#073642",
      surface2: "#0d3f4d",
      border: "#586e75",
      text: "#839496",
      textMuted: "#657b83",
      accent: "#2aa198",
      accentDim: "#2aa19826",
      accentHover: "#268bd2",
    },
  },
];

export const DEFAULT_THEME_ID = "gruvbox-dark";

export function getThemeById(id: string): SyntaxTheme {
  return SYNTAX_THEMES.find((t) => t.id === id) ?? SYNTAX_THEMES[0];
}
