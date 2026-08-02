import { describe, expect, it } from "vitest";
import { getReadableForeground } from "./color";

describe("getReadableForeground", () => {
  it("picks white text on a dark background", () => {
    expect(getReadableForeground("#1a1a1a")).toBe("#ffffff");
  });

  it("picks black text on a light background", () => {
    expect(getReadableForeground("#f5f5f5")).toBe("#000000");
  });

  it("picks black text on the default rosé/coral accent", () => {
    expect(getReadableForeground("#c4677a")).toBe("#000000");
  });
});
