import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { createTheme } from "@uiw/codemirror-themes";
import { getLanguageExtension } from "@/lib/codemirror-langs";

const darkTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--color-bg)",
    foreground: "var(--color-text)",
    caret: "var(--color-accent)",
    selection: "rgba(99,102,241,0.2)",
    selectionMatch: "rgba(99,102,241,0.1)",
    lineHighlight: "var(--color-surface)",
    gutterBackground: "var(--color-surface)",
    gutterForeground: "var(--color-text-muted)",
    gutterBorder: "var(--color-border)",
    gutterActiveForeground: "var(--color-text)",
  },
  styles: [],
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const extensions = useMemo(() => {
    const ext = getLanguageExtension(language);
    return ext ? [ext] : [];
  }, [language]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={darkTheme}
      extensions={extensions}
      style={{
        fontSize: "13px",
        borderRadius: "8px",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }}
      minHeight="300px"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
      }}
    />
  );
}
