import { describe, expect, it } from "vitest";

import {
    CATEGORY_COLORS,
    NEUTRAL_CATEGORY_COLOR,
    buildCategorySlices,
    getCategoryColorMap,
} from "./categoryColors";

const categories = [
    { id: 30, name: "Lazer" },
    { id: 10, name: "Mercado" },
    { id: 20, name: "Moradia" },
];

describe("getCategoryColorMap", () => {
    it("dá a cor pela ordem de criação, não pela ordem recebida", () => {
        const colors = getCategoryColorMap(categories);

        expect(colors.get(10)).toBe(CATEGORY_COLORS[0]);
        expect(colors.get(20)).toBe(CATEGORY_COLORS[1]);
        expect(colors.get(30)).toBe(CATEGORY_COLORS[2]);
    });
});

describe("buildCategorySlices", () => {
    const colorMap = getCategoryColorMap(categories);

    it("mantém a cor da categoria quando o ranking muda de um mês para o outro", () => {
        const october = buildCategorySlices([
            { category_id: 10, category: "Mercado", total: "500" },
            { category_id: 30, category: "Lazer", total: "100" },
        ], colorMap);
        const november = buildCategorySlices([
            { category_id: 30, category: "Lazer", total: "900" },
            { category_id: 10, category: "Mercado", total: "50" },
        ], colorMap);

        const colorOf = (slices, name) => slices.find((slice) => slice.name === name).color;

        expect(colorOf(october, "Mercado")).toBe(colorOf(november, "Mercado"));
        expect(colorOf(october, "Lazer")).toBe(colorOf(november, "Lazer"));
        expect(november[0].name).toBe("Lazer");
    });

    it("usa cinza para transações sem categoria", () => {
        const [slice] = buildCategorySlices([{ category_id: null, category: null, total: "10" }], colorMap);

        expect(slice.name).toBe("Sem categoria");
        expect(slice.color).toBe(NEUTRAL_CATEGORY_COLOR);
    });

    it("agrupa o excesso em Outras e nunca repete cor", () => {
        const many = Array.from({ length: 9 }, (_, index) => ({ id: index + 1, name: `C${index}` }));
        const slices = buildCategorySlices(
            many.map((category, index) => ({ category_id: category.id, category: category.name, total: String(100 - index) })),
            getCategoryColorMap(many)
        );

        expect(slices).toHaveLength(CATEGORY_COLORS.length);
        expect(slices.at(-1)).toMatchObject({ name: "Outras (4)", value: 95 + 94 + 93 + 92, color: NEUTRAL_CATEGORY_COLOR });

        const colors = slices.slice(0, -1).map((slice) => slice.color);
        expect(new Set(colors).size).toBe(colors.length);
    });
});
