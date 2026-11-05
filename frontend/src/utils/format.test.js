import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatDateToISO, formatDayLabel, pluralize } from "./format";

describe("pluralize", () => {
    it("usa o singular só para 1", () => {
        expect(pluralize(1, "lançamento", "lançamentos")).toBe("1 lançamento");
        expect(pluralize(0, "lançamento", "lançamentos")).toBe("0 lançamentos");
        expect(pluralize(25, "lançamento", "lançamentos")).toBe("25 lançamentos");
    });
});

describe("datas", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 10, 5, 22, 30));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("formata a data no fuso local, mesmo depois das 21h", () => {
        expect(formatDateToISO(new Date())).toBe("2026-11-05");
    });

    it("chama hoje e ontem pelo nome", () => {
        expect(formatDayLabel("2026-11-05")).toBe("Hoje");
        expect(formatDayLabel("2026-11-04")).toBe("Ontem");
        expect(formatDayLabel("2026-11-02")).toBe("2 de novembro");
    });

    it("mostra o ano quando a data é de outro ano", () => {
        expect(formatDayLabel("2025-12-31")).toBe("31 de dezembro de 2025");
    });
});
