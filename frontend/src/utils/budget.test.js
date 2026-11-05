import { describe, expect, it } from "vitest";

import { getBudgetStatus } from "./budget";

describe("getBudgetStatus", () => {
    it("ignora categorias sem orçamento", () => {
        expect(getBudgetStatus(100, null)).toBeNull();
        expect(getBudgetStatus(100, "0")).toBeNull();
    });

    it("fica ok abaixo de 80%", () => {
        expect(getBudgetStatus(500, "800.00")).toEqual({ ratio: 0.625, remaining: 300, level: "ok" });
    });

    it("avisa a partir de 80%, inclusive quando bate o limite exato", () => {
        expect(getBudgetStatus(640, "800").level).toBe("warning");
        expect(getBudgetStatus(800, "800").level).toBe("warning");
    });

    it("marca como estourado quando passa do limite", () => {
        expect(getBudgetStatus(850, "800")).toMatchObject({ level: "over", remaining: -50 });
    });
});
