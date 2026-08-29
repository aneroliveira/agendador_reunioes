import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("strips accents", () => {
    expect(slugify("Chamada Rápida")).toBe("chamada-rapida");
    expect(slugify("Conversa Flexível")).toBe("conversa-flexivel");
  });

  it("collapses punctuation and whitespace into single hyphens", () => {
    expect(slugify("  --Olá, Mundo--  ")).toBe("ola-mundo");
  });

  it("lowercases the result", () => {
    expect(slugify("ISSO É RAPIDINHO")).toBe("isso-e-rapidinho");
  });
});
