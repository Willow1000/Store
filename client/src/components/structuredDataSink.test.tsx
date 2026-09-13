// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SEOHead } from "./SEOHead";

/**
 * The CSP sends `require-trusted-types-for 'script'` (server/_core/security.ts).
 * Under that policy, assigning a STRING to a <script> element's textContent /
 * innerHTML / text is a guarded sink and throws
 *   TypeError: This document requires 'TrustedScript' assignment
 * which meant the JSON-LD was never written client-side.
 *
 * jsdom does not enforce Trusted Types, so instead of relying on the browser to
 * throw, this installs a trap on the guarded sinks and asserts our code never
 * reaches them - while still verifying the structured data lands in the DOM.
 */
function trapScriptStringSinks(): { violations: string[] } {
  const violations: string[] = [];
  const proto = HTMLScriptElement.prototype as unknown as Record<
    string,
    unknown
  >;

  for (const prop of ["text", "innerHTML"]) {
    Object.defineProperty(proto, prop, {
      configurable: true,
      set() {
        violations.push(prop);
      },
      get() {
        return "";
      },
    });
  }

  // textContent lives on Node, so trap it only for script elements.
  const nodeDesc = Object.getOwnPropertyDescriptor(
    Node.prototype,
    "textContent"
  )!;
  Object.defineProperty(proto, "textContent", {
    configurable: true,
    set(this: HTMLScriptElement, value: string) {
      violations.push("textContent");
      nodeDesc.set!.call(this, value);
    },
    get(this: HTMLScriptElement) {
      return nodeDesc.get!.call(this);
    },
  });

  return { violations };
}

describe("structured data injection", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("writes JSON-LD without using a Trusted-Types-guarded script sink", () => {
    const { violations } = trapScriptStringSinks();

    render(
      <SEOHead
        pageType="article"
        title="Trusted Types regression guard"
        description="Ensures JSON-LD is inserted as a text node."
        canonical="/blog/example"
      />
    );

    expect(violations).toEqual([]);

    const script = document.querySelector(
      'script[type="application/ld+json"][data-seo-head="true"]'
    );
    expect(script).not.toBeNull();

    const parsed = JSON.parse(script!.textContent || "{}");
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);
  });
});
