import type { Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { sql } from "@codemirror/lang-sql";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { php } from "@codemirror/lang-php";
import { go } from "@codemirror/lang-go";

export function getLanguageExtension(lang: string): Extension | null {
  switch (lang) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "python":
      return python();
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "xml":
      return xml();
    case "sql":
      return sql();
    case "rust":
      return rust();
    case "java":
    case "kotlin":
      return java();
    case "cpp":
    case "c":
      return cpp();
    case "php":
      return php();
    case "go":
      return go();
    default:
      return null;
  }
}
