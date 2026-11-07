import { describe, expect, it } from "vitest";

import { getPresetRange } from "./statement";

describe("getPresetRange", () => {
    const today = new Date(2026, 10, 6);

    it("cobre o mês inteiro", () => {
        expect(getPresetRange("this-month", today)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    });

    it("volta para o mês anterior, inclusive na virada do ano", () => {
        expect(getPresetRange("last-month", today)).toEqual({ start: "2026-10-01", end: "2026-10-31" });
        expect(getPresetRange("last-month", new Date(2026, 0, 15))).toEqual({ start: "2025-12-01", end: "2025-12-31" });
    });

    it("conta o mês atual nos últimos 3 meses", () => {
        expect(getPresetRange("last-3-months", today)).toEqual({ start: "2026-09-01", end: "2026-11-30" });
    });

    it("cobre o ano inteiro", () => {
        expect(getPresetRange("this-year", today)).toEqual({ start: "2026-01-01", end: "2026-12-31" });
    });
});
