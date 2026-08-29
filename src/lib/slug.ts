// Range of Unicode combining diacritical marks (what NFD decomposition
// splits accented letters into) — built from char codes instead of a
// \u-escaped regex literal to avoid any ambiguity in how that gets typed.
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

/**
 * Turns a title into a URL-safe slug: strips accents, lowercases, and
 * collapses anything that isn't a-z/0-9 into a single hyphen.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
