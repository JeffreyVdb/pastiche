// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownCode } from "../MarkdownCode";

const mockUseTheme = vi.fn(() => ({
  theme: { hljs: {} },
  resolved: "dark",
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock("react-markdown-mermaid", () => ({
  MermaidBlock: ({
    code,
    mermaidConfig,
  }: {
    code: string;
    mermaidConfig?: { theme?: string };
  }) => (
    <div data-testid="mermaid-block" data-code={code} data-theme={mermaidConfig?.theme ?? ""}>
      {code}
    </div>
  ),
}));

vi.mock("react-syntax-highlighter", () => ({
  default: ({ children, language }: { children: string; language?: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language ?? ""}>
      {children}
    </pre>
  ),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mockUseTheme.mockReturnValue({
    theme: { hljs: {} },
    resolved: "dark",
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe("MarkdownCode", () => {
  it("renders mermaid code fences with MermaidBlock", () => {
    act(() => {
      root.render(
        <MarkdownCode className="language-mermaid">
          {"graph TD\nA-->B\n"}
        </MarkdownCode>,
      );
    });

    const mermaid = container.querySelector('[data-testid="mermaid-block"]');
    expect(mermaid).not.toBeNull();
    expect(mermaid?.getAttribute("data-code")).toBe("graph TD\nA-->B");
    expect(mermaid?.getAttribute("data-theme")).toBe("dark");
    expect(container.querySelector('[data-testid="syntax-highlighter"]')).toBeNull();
  });

  it("matches Mermaid theme to the active app theme", () => {
    mockUseTheme.mockReturnValue({
      theme: { hljs: {} },
      resolved: "light",
    });

    act(() => {
      root.render(
        <MarkdownCode className="language-mermaid">
          {"graph TD\nA-->B\n"}
        </MarkdownCode>,
      );
    });

    expect(container.querySelector('[data-testid="mermaid-block"]')?.getAttribute("data-theme")).toBe("default");
  });

  it("renders non-mermaid code fences with SyntaxHighlighter", () => {
    act(() => {
      root.render(
        <MarkdownCode className="language-typescript">
          {"const answer = 42;\n"}
        </MarkdownCode>,
      );
    });

    const highlighted = container.querySelector('[data-testid="syntax-highlighter"]');
    expect(highlighted).not.toBeNull();
    expect(highlighted?.getAttribute("data-language")).toBe("typescript");
    expect(highlighted?.textContent).toContain("const answer = 42;");
  });

  it("renders plain inline code when no language is provided", () => {
    act(() => {
      root.render(<MarkdownCode>inline()</MarkdownCode>);
    });

    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("inline()");
    expect(container.querySelector('[data-testid="syntax-highlighter"]')).toBeNull();
    expect(container.querySelector('[data-testid="mermaid-block"]')).toBeNull();
  });

  it("restores markdown list markers and mermaid container styles in index.css", () => {
    const css = readFileSync(`${process.cwd()}/src/index.css`, "utf8");

    expect(css).toMatch(/\.markdown-preview ul\s*{[^}]*list-style-type:\s*disc;/s);
    expect(css).toMatch(/\.markdown-preview ol\s*{[^}]*list-style-type:\s*decimal;/s);
    expect(css).toMatch(/\.markdown-preview \.mermaid-block\s*{/s);
    expect(css).toMatch(/\.markdown-preview \.mermaid-block svg\s*{/s);
  });
});
