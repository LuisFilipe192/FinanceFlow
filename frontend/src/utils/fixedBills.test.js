import { describe, expect, it } from "vitest";

import { getBillStatusLabel, getDefaultPaymentDate } from "./fixedBills";

describe("getBillStatusLabel", () => {
    it("descreve cada situação da conta", () => {
        expect(getBillStatusLabel({ status: "paid", payment: { date: "2026-11-06" } })).toBe("Paga em 06/11");
        expect(getBillStatusLabel({ status: "due_today", due_date: "2026-11-06" })).toBe("Vence hoje");
        expect(getBillStatusLabel({ status: "overdue", due_date: "2026-11-02" })).toBe("Atrasada desde 02/11");
        expect(getBillStatusLabel({ status: "overdue", due_date: null })).toBe("Não paga no mês");
        expect(getBillStatusLabel({ status: "pending", due_date: "2026-11-12" })).toBe("Vence dia 12");
        expect(getBillStatusLabel({ status: "pending", due_date: null })).toBe("Sem vencimento");
    });
});

describe("getDefaultPaymentDate", () => {
    const today = new Date(2026, 10, 6);

    it("usa hoje quando a tela está no mês atual", () => {
        const bill = { due_date: "2026-11-20" };

        expect(getDefaultPaymentDate(bill, { month: 11, year: 2026 }, today)).toBe("2026-11-06");
    });

    it("fica dentro do mês escolhido quando ele não é o atual", () => {
        const period = { month: 10, year: 2026 };

        expect(getDefaultPaymentDate({ due_date: "2026-10-15" }, period, today)).toBe("2026-10-15");
        expect(getDefaultPaymentDate({ due_date: null }, period, today)).toBe("2026-10-01");
    });
});
