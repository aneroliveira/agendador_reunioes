import { describe, expect, it } from "vitest";
import { getBrazilianHolidays } from "./holidays";

function find(list: ReturnType<typeof getBrazilianHolidays>, label: string) {
  return list.find((h) => h.label === label)?.date;
}

describe("getBrazilianHolidays", () => {
  it("computes fixed-date holidays", () => {
    const list = getBrazilianHolidays(2026);
    expect(find(list, "Confraternização Universal")).toBe("2026-01-01");
    expect(find(list, "Tiradentes")).toBe("2026-04-21");
    expect(find(list, "Dia do Trabalho")).toBe("2026-05-01");
    expect(find(list, "Independência do Brasil")).toBe("2026-09-07");
    expect(find(list, "Nossa Senhora Aparecida")).toBe("2026-10-12");
    expect(find(list, "Finados")).toBe("2026-11-02");
    expect(find(list, "Proclamação da República")).toBe("2026-11-15");
    expect(find(list, "Natal")).toBe("2026-12-25");
  });

  it("computes Easter-derived holidays for known years", () => {
    // Easter Sunday 2026-04-05, 2025-04-20 (both independently verifiable).
    expect(find(getBrazilianHolidays(2026), "Carnaval")).toBe("2026-02-17");
    expect(find(getBrazilianHolidays(2026), "Sexta-feira Santa")).toBe("2026-04-03");
    expect(find(getBrazilianHolidays(2026), "Corpus Christi")).toBe("2026-06-04");
    expect(find(getBrazilianHolidays(2025), "Carnaval")).toBe("2025-03-04");
  });

  it("returns the list sorted by date", () => {
    const list = getBrazilianHolidays(2026);
    const dates = list.map((h) => h.date);
    expect(dates).toEqual([...dates].sort());
  });
});
