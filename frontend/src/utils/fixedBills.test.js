import { describe, expect, it } from "vitest";

import { getBillStatusLabel, getBillUrgency, getDefaultPaymentDate } from "./fixedBills";

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

describe("getBillUrgency", () => {
    const today = new Date(2026, 10, 6, 21, 30);
    const pendingUntil = (due_date) => getBillUrgency({ status: "pending", due_date }, today);

    it("fica calma com mais de 7 dias ou sem vencimento", () => {
        expect(pendingUntil("2026-11-14")).toBe("calm");
        expect(pendingUntil(null)).toBe("calm");
    });

    it("avisa nos últimos 7 dias", () => {
        expect(pendingUntil("2026-11-13")).toBe("soon");
        expect(pendingUntil("2026-11-08")).toBe("soon");
    });

    it("fica urgente na véspera e no dia do vencimento", () => {
        expect(pendingUntil("2026-11-07")).toBe("urgent");
        expect(getBillUrgency({ status: "due_today", due_date: "2026-11-06" }, today)).toBe("urgent");
    });

    it("mantém contas pagas e vencidas no próprio estado", () => {
        expect(getBillUrgency({ status: "paid", due_date: "2026-11-07" }, today)).toBe("paid");
        expect(getBillUrgency({ status: "overdue", due_date: null }, today)).toBe("overdue");
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
