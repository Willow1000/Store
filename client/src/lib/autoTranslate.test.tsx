// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useGlobalAutoTranslation } from "@/lib/autoTranslate";
import { UI_STRINGS } from "@/i18n/uiStrings";
import type { SiteLanguageCode } from "@/lib/language";

/**
 * The runtime translator walks the DOM and rewrites text nodes. React, for
 * its part, updates text IN PLACE - the same Text node gets a new value when
 * a cart total changes or the hero advances a slide. The translator used to
 * remember only the first value it saw for a node and write that back over
 * every later update, so on-screen totals froze (in English too). These tests
 * pin the fixed behaviour: app updates win, and are translated from the NEW
 * source text.
 */

let setLabel: (value: string) => void = () => {};

function Harness({ language }: { language: SiteLanguageCode }) {
  useGlobalAutoTranslation(language);
  const [label, setLabelState] = useState("Add to Cart");
  setLabel = setLabelState;
  return (
    <section>
      <button data-testid="action" aria-label={label}>
        {label}
      </button>
    </section>
  );
}

function mountInRoot(language: SiteLanguageCode) {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  return render(<Harness language={language} />, { container: root });
}

describe("useGlobalAutoTranslation with in-place text updates", () => {
  beforeEach(() => {
    // Dictionary-backed strings must never need the network.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("unexpected translation request");
      })
    );
  });

  afterEach(() => {
    cleanup();
    document.getElementById("root")?.remove();
    vi.unstubAllGlobals();
  });

  it("keeps the app's new text in English instead of restoring the first value", async () => {
    const { getByTestId } = mountInRoot("en");
    const button = getByTestId("action");
    expect(button).toHaveTextContent("Add to Cart");

    // Let the initial scan record the node.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    await act(async () => {
      setLabel("Out of Stock");
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    expect(button).toHaveTextContent("Out of Stock");
    expect(button).toHaveAttribute("aria-label", "Out of Stock");
  });

  it("translates the updated text, not the stale original", async () => {
    const { getByTestId } = mountInRoot("de");
    const button = getByTestId("action");

    await waitFor(() =>
      expect(button).toHaveTextContent(UI_STRINGS["Add to Cart"].de)
    );

    await act(async () => {
      setLabel("Out of Stock");
      await new Promise(resolve => setTimeout(resolve, 40));
    });

    await waitFor(() =>
      expect(button).toHaveTextContent(UI_STRINGS["Out of Stock"].de)
    );
    expect(button).toHaveAttribute("aria-label", UI_STRINGS["Out of Stock"].de);
  });
});
