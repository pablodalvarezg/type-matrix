import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Reads the tokens straight out of globals.css, so a tone changed there is a
 * tone checked here. The pairs are every text/background combination the theme
 * allows; see the comment at the top of globals.css for why that is not all of
 * them.
 */
const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);
const [lightCss, darkCss] = css.split("@media (prefers-color-scheme: dark)");

function tokens(block = ""): Record<string, string> {
  const root = /:root\s*\{([^}]*)\}/.exec(block)?.[1] ?? "";
  return Object.fromEntries(
    [...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [
      m[1],
      m[2],
    ]),
  );
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const texts = ["foreground", "muted"];
const backgrounds = ["background", "surface"];

describe.each([
  ["light", tokens(lightCss)],
  ["dark", tokens(darkCss)],
])("%s theme", (_, theme) => {
  it("defines all four tones", () => {
    expect(Object.keys(theme).sort()).toEqual(
      [...texts, ...backgrounds].sort(),
    );
  });

  for (const text of texts) {
    for (const bg of backgrounds) {
      it(`${text} on ${bg} passes AA (4.5:1)`, () => {
        expect(contrast(theme[text]!, theme[bg]!)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

it("contrast matches the WCAG reference values", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
});
