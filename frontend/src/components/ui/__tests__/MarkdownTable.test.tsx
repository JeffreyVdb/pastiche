// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MarkdownTable } from "../MarkdownTable";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
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

describe("MarkdownTable", () => {
  it("wraps rendered tables in a horizontal scroll container", () => {
    act(() => {
      root.render(
        <MarkdownTable>
          <thead>
            <tr>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Louis</td>
            </tr>
          </tbody>
        </MarkdownTable>,
      );
    });

    const wrapper = container.querySelector(".markdown-table-scroll");
    const table = wrapper?.querySelector("table");

    expect(wrapper).not.toBeNull();
    expect(table).not.toBeNull();
    expect(table?.querySelector("th")?.textContent).toBe("Name");
    expect(table?.querySelector("td")?.textContent).toBe("Louis");
  });

  it("does not forward react-markdown node metadata to the DOM", () => {
    act(() => {
      root.render(
        <MarkdownTable node={{ type: "element", tagName: "table" }}>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </MarkdownTable>,
      );
    });

    const table = container.querySelector("table");

    expect(table).not.toBeNull();
    expect(table?.hasAttribute("node")).toBe(false);
  });
});
