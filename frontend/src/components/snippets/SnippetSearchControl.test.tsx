// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnippetSearchControl } from "./SnippetSearchControl";
import type { LabelRead } from "@/types/snippet";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const BASE_LABELS: LabelRead[] = [
  { id: "1", name: "feature", color: "#22c55e" },
  { id: "2", name: "frontend", color: "#3b82f6" },
  { id: "3", name: "bug", color: "#ef4444" },
  { id: "4", name: "wip", color: "#f59e0b" },
];

function Harness({
  initialValue = "",
  allLabels = BASE_LABELS,
}: {
  initialValue?: string;
  allLabels?: LabelRead[];
}) {
  const [value, setValue] = React.useState(initialValue);
  const [open, setOpen] = React.useState(true);
  const [commitCount, setCommitCount] = React.useState(0);

  return (
    <>
      <SnippetSearchControl
        allLabels={allLabels}
        isMobile={false}
        open={open}
        value={value}
        onChange={setValue}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onClear={() => setValue("")}
        onCommitNow={() => setCommitCount((count) => count + 1)}
      />
      <output data-testid="value">{value}</output>
      <output data-testid="commit-count">{commitCount}</output>
    </>
  );
}

function renderHarness(props?: { initialValue?: string; allLabels?: LabelRead[] }) {
  act(() => {
    root.render(<Harness {...props} />);
  });

  const input = container.querySelector('input[type="search"]') as HTMLInputElement | null;
  if (!input) throw new Error("Search input not found");
  return input;
}

function getValue() {
  return container.querySelector('[data-testid="value"]')?.textContent ?? "";
}

function getCommitCount() {
  return Number(container.querySelector('[data-testid="commit-count"]')?.textContent ?? "0");
}

function getSuggestions() {
  return Array.from(container.querySelectorAll('[data-testid="label-suggestion"]')) as HTMLButtonElement[];
}

async function typeInInput(input: HTMLInputElement, nextValue: string) {
  await act(async () => {
    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, nextValue);
    input.setSelectionRange(nextValue.length, nextValue.length);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: nextValue.slice(-1) || null }));
    input.dispatchEvent(new KeyboardEvent("keyup", { key: nextValue.slice(-1) || "Backspace", bubbles: true }));
  });
}

async function clickInput(input: HTMLInputElement, cursorPos = input.value.length) {
  await act(async () => {
    input.focus();
    input.setSelectionRange(cursorPos, cursorPos);
    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function keyDown(input: HTMLInputElement, key: string, shiftKey = false) {
  await act(async () => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, shiftKey }));
  });
}

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
  vi.restoreAllMocks();
});

describe("SnippetSearchControl", () => {
  it("does not show label suggestions when the query has no hash token", async () => {
    const input = renderHarness();

    await typeInInput(input, "debounce hook");

    expect(getSuggestions()).toHaveLength(0);
  });

  it("shows label suggestions when typing a hash token", async () => {
    const input = renderHarness();

    await typeInInput(input, "#");

    expect(getSuggestions().map((item) => item.textContent?.trim())).toEqual([
      "feature",
      "frontend",
      "bug",
      "wip",
    ]);
  });

  it("filters labels by partial token text", async () => {
    const input = renderHarness();

    await typeInInput(input, "#fea");

    expect(getSuggestions().map((item) => item.textContent)).toEqual(["feature"]);
  });

  it("limits suggestions to eight items", async () => {
    const allLabels = Array.from({ length: 20 }, (_, index) => ({
      id: String(index + 1),
      name: `feature-${index + 1}`,
      color: "#22c55e",
    }));
    const input = renderHarness({ allLabels });

    await typeInInput(input, "#");

    expect(getSuggestions()).toHaveLength(8);
  });

  it("replaces the active token when a label is clicked", async () => {
    const input = renderHarness();

    await typeInInput(input, "#fea");

    const suggestion = getSuggestions()[0];
    await act(async () => {
      suggestion.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(getValue()).toBe("#feature ");
    expect(input.selectionStart).toBe("#feature ".length);
  });

  it("supports keyboard navigation and enter selection without committing the search", async () => {
    const input = renderHarness();

    await typeInInput(input, "#");
    await keyDown(input, "ArrowDown");
    await keyDown(input, "Enter");

    expect(getValue()).toBe("#frontend ");
    expect(getCommitCount()).toBe(0);
  });

  it("dismisses suggestions on escape without clearing the search value", async () => {
    const input = renderHarness();

    await typeInInput(input, "#");
    await keyDown(input, "Escape");

    expect(getSuggestions()).toHaveLength(0);
    expect(getValue()).toBe("#");
  });

  it("activates autocomplete for hash tokens after existing search text", async () => {
    const input = renderHarness({ initialValue: "some text #fea" });

    await clickInput(input, "some text #fea".length);
    input.setSelectionRange("some text #fea".length, "some text #fea".length);
    await keyDown(input, "ArrowDown");
    await keyDown(input, "ArrowUp");

    expect(getSuggestions().map((item) => item.textContent)).toEqual(["feature"]);
  });

  it("replaces the entire active token when selecting from the middle of a label", async () => {
    const input = renderHarness({ initialValue: "#feature rest" });

    await clickInput(input, "#fea".length);
    await keyDown(input, "Enter");

    expect(getValue()).toBe("#feature rest");
  });

  it("does not introduce duplicate spaces when selecting before existing whitespace", async () => {
    const input = renderHarness({ initialValue: "#fea rest" });

    await clickInput(input, "#fea".length);
    await keyDown(input, "Enter");

    expect(getValue()).toBe("#feature rest");
  });

  it("selects the first suggestion when tab is pressed", async () => {
    const input = renderHarness();

    await typeInInput(input, "#fr");
    await keyDown(input, "Tab");

    expect(getValue()).toBe("#frontend ");
  });
});
