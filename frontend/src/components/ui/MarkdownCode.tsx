import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { MermaidBlock } from "react-markdown-mermaid";
import SyntaxHighlighter from "react-syntax-highlighter";
import { useTheme } from "@/hooks/useTheme";

type MarkdownCodeProps = ComponentPropsWithoutRef<"code"> & {
  children?: ReactNode;
  node?: unknown;
};

const MERMAID_BASE_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  flowchart: {
    useMaxWidth: true,
  },
};

const LANGUAGE_CLASS_PATTERN = /language-([\w-]+)/;

export function MarkdownCode({ children, className, ...props }: MarkdownCodeProps) {
  const { theme, resolved } = useTheme();
  const code = String(children ?? "").replace(/\n$/, "");
  const language = className?.match(LANGUAGE_CLASS_PATTERN)?.[1];
  const mermaidConfig = {
    ...MERMAID_BASE_CONFIG,
    theme: resolved === "light" ? "default" : "dark",
  };

  if (language === "mermaid") {
    return (
      <MermaidBlock
        code={code}
        className="mermaid-block"
        mermaidConfig={mermaidConfig}
        onError={(error) => {
          console.warn("Failed to render Mermaid diagram", error);
        }}
      />
    );
  }

  if (language) {
    return (
      <SyntaxHighlighter
        PreTag="div"
        language={language}
        style={theme.hljs}
        customStyle={{
          background: "var(--color-surface)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.85em",
          lineHeight: "1.6",
          padding: "16px 20px",
          margin: 0,
          borderRadius: "10px",
        }}
      >
        {code}
      </SyntaxHighlighter>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
