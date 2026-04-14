// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useSnippetSearchSession,
  type UseSnippetSearchSessionOptions,
} from "../useSnippetSearchSession";

const SEARCH_DEBOUNCE_MS = 250;

type NavigateMock = UseSnippetSearchSessionOptions["navigate"];

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let latestSession: ReturnType<typeof useSnippetSearchSession> | null = null;

function Harness(props: { routeQuery: string; navigate: NavigateMock }) {
  latestSession = useSnippetSearchSession(props);
  return null;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  latestSession = null;
  vi.useRealTimers();
});

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

describe("useSnippetSearchSession", () => {
  it("debounces raw input into the committed search query before the router catches up", async () => {
    vi.useFakeTimers();
    const navigate = vi.fn() as unknown as NavigateMock;

    act(() => {
      root.render(<Harness routeQuery="data" navigate={navigate} />);
    });

    expect(latestSession?.rawQuery).toBe("data");
    expect(latestSession?.searchQuery).toBe("data");

    act(() => {
      latestSession?.setRawQuery("datadog");
    });

    expect(latestSession?.rawQuery).toBe("datadog");
    expect(latestSession?.searchQuery).toBe("data");
    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    });

    expect(latestSession?.searchQuery).toBe("datadog");
    expect(navigate).toHaveBeenCalledWith({
      to: "/",
      search: { q: "datadog" },
      replace: true,
    });

    act(() => {
      root.render(<Harness routeQuery="datadog" navigate={navigate} />);
    });

    expect(latestSession?.rawQuery).toBe("datadog");
    expect(latestSession?.searchQuery).toBe("datadog");
  });

  it("clears both query states immediately", () => {
    const navigate = vi.fn() as unknown as NavigateMock;

    act(() => {
      root.render(<Harness routeQuery="data" navigate={navigate} />);
    });

    act(() => {
      latestSession?.clearSearch();
    });

    expect(latestSession?.rawQuery).toBe("");
    expect(latestSession?.searchQuery).toBe("");
    expect(navigate).toHaveBeenCalledWith({
      to: "/",
      search: {},
      replace: true,
    });
  });
});
