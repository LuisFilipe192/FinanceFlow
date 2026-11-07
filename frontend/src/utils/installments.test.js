import { describe, expect, it } from "vitest";

import {
    getLastInstallmentLabel,
    hasFollowingInstallments,
    isValidInstallmentCount,
} from "./installments";

describe("isValidInstallmentCount", () => {
    it("aceita de 2 a 60 parcelas", () => {
        expect(isValidInstallmentCount(2)).toBe(true);
        expect(isValidInstallmentCount(60)).toBe(true);
    });

    it("recusa valores fora do limite ou vazios", () => {
        expect(isValidInstallmentCount(1)).toBe(false);
        expect(isValidInstallmentCount(61)).toBe(false);
        expect(isValidInstallmentCount(0)).toBe(false);
        expect(isValidInstallmentCount(Number.NaN)).toBe(false);
    });
});

describe("getLastInstallmentLabel", () => {
    it("conta a primeira parcela e atravessa a virada do ano", () => {
        expect(getLastInstallmentLabel("2026-11-06", 3)).toBe("janeiro de 2027");
    });

    it("não pula fevereiro quando a compra é no dia 31", () => {
        expect(getLastInstallmentLabel("2026-01-31", 2)).toBe("fevereiro de 2026");
    });
});

describe("hasFollowingInstallments", () => {
    it("só é verdadeiro quando ainda há parcelas depois desta", () => {
        expect(hasFollowingInstallments({ installment_number: 2, installment_total: 3 })).toBe(true);
        expect(hasFollowingInstallments({ installment_number: 3, installment_total: 3 })).toBe(false);
        expect(hasFollowingInstallments({ installment_number: null, installment_total: null })).toBe(false);
    });
});
