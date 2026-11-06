import { describe, expect, it } from "vitest";

import { buildInsight, sumExpensesUntil } from "./insights";

const october = Array.from({ length: 31 }, (_, index) => ({
    day: index + 1,
    income: "0.00",
    expenses: "100.00",
}));

describe("sumExpensesUntil", () => {
    it("soma só até o dia pedido", () => {
        expect(sumExpensesUntil(october, 5)).toBe(500);
    });

    it("soma o mês inteiro quando não há limite", () => {
        expect(sumExpensesUntil(october)).toBe(3100);
    });

    it("usa o mês anterior inteiro quando ele é mais curto que o dia pedido", () => {
        expect(sumExpensesUntil(october.slice(0, 28), 31)).toBe(2800);
    });
});

describe("buildInsight", () => {
    const base = {
        summary: { income: "5000.00", expenses: "450.00" },
        expensesByCategory: [],
        month: 11,
        year: 2026,
    };

    it("compara o mês atual com o mesmo período do mês anterior", () => {
        const { sentences, tone } = buildInsight({
            ...base,
            previousComparison: { expenses: sumExpensesUntil(october, 5), untilDay: 5 },
        });

        expect(sentences[0]).toBe("Você gastou 10% menos que no mesmo período de outubro. Boa!");
        expect(tone).toBe("positive");
    });

    it("compara meses fechados pelo total", () => {
        const { sentences } = buildInsight({
            ...base,
            summary: { income: "5000.00", expenses: "3410.00" },
            previousComparison: { expenses: sumExpensesUntil(october), untilDay: null },
        });

        expect(sentences[0]).toBe("Você gastou 10% mais que em outubro.");
    });

    it("trata variação pequena como gastos parecidos", () => {
        const { sentences } = buildInsight({
            ...base,
            summary: { income: "5000.00", expenses: "510.00" },
            previousComparison: { expenses: 500, untilDay: 5 },
        });

        expect(sentences[0]).toBe("Seus gastos estão parecidos com os do mesmo período de outubro.");
    });

    it("avisa quando as despesas passam as receitas", () => {
        const { sentences, tone } = buildInsight({
            ...base,
            summary: { income: "100.00", expenses: "250.00" },
            previousComparison: null,
        });

        expect(tone).toBe("warning");
        expect(sentences[0]).toContain("as despesas passaram as receitas");
    });

    it("convida a registrar quando o mês está vazio", () => {
        const { sentences } = buildInsight({
            ...base,
            summary: { income: "0", expenses: "0" },
            previousComparison: null,
        });

        expect(sentences).toEqual(["Nenhuma movimentação em novembro de 2026. Que tal registrar a primeira?"]);
    });

    it("avisa quando uma categoria passa do orçamento, no lugar da maior despesa", () => {
        const { sentences, tone } = buildInsight({
            ...base,
            previousComparison: null,
            expensesByCategory: [
                { category_id: 1, category: "Mercado", total: "412.00" },
                { category_id: 2, category: "Lazer", total: "38.00" },
            ],
            budgets: new Map([[1, "400.00"], [2, "40.00"]]),
        });

        expect(tone).toBe("warning");
        expect(sentences.at(-1).replace(/\s/g, " ")).toBe("Mercado passou do orçamento em R$ 12,00.");
    });

    it("avisa quando uma categoria chega a 80% do orçamento", () => {
        const { sentences, tone } = buildInsight({
            ...base,
            previousComparison: null,
            expensesByCategory: [{ category_id: 1, category: "Mercado", total: "368.00" }],
            budgets: new Map([[1, "400.00"]]),
        });

        expect(tone).toBe("neutral");
        expect(sentences.at(-1)).toBe("Mercado já usou 92% do orçamento.");
    });

    it("avisa sobre contas fixas atrasadas", () => {
        const { sentences, tone } = buildInsight({
            ...base,
            previousComparison: null,
            billsSummary: { overdue_count: 2, pending_count: 3, pending_total: "300.00" },
        });

        expect(tone).toBe("warning");
        expect(sentences.at(-1)).toBe("2 contas fixas estão atrasadas.");
    });

    it("diz quanto falta pagar em contas fixas", () => {
        const { sentences } = buildInsight({
            ...base,
            previousComparison: null,
            billsSummary: { overdue_count: 0, pending_count: 2, pending_total: "155.90" },
        });

        expect(sentences.at(-1).replace(/\s/g, " ")).toBe("Faltam R$ 155,90 em contas fixas este mês.");
    });

    it("orçamento estourado vem antes das contas fixas", () => {
        const { sentences } = buildInsight({
            ...base,
            previousComparison: null,
            expensesByCategory: [{ category_id: 1, category: "Mercado", total: "412.00" }],
            budgets: new Map([[1, "400.00"]]),
            billsSummary: { overdue_count: 1, pending_count: 1, pending_total: "50.00" },
        });

        expect(sentences.at(-1)).toContain("passou do orçamento");
    });

    it("cita a categoria com maior gasto", () => {
        const { sentences } = buildInsight({
            ...base,
            previousComparison: null,
            expensesByCategory: [
                { category: "Lazer", total: "50.00" },
                { category: "Mercado", total: "400.00" },
            ],
        });

        expect(sentences.at(-1).replace(/\s/g, " ")).toBe("Mercado foi sua maior despesa: R$ 400,00.");
    });
});
