export const CATEGORY_COLORS = [
    "#3987e5",
    "#d95926",
    "#199e70",
    "#c98500",
    "#d55181",
    "#9085e9",
];

export const NEUTRAL_CATEGORY_COLOR = "#59625c";

const MAX_SLICES = CATEGORY_COLORS.length;

export function getCategoryColorMap(categories) {
    const ordered = [...categories].sort((a, b) => a.id - b.id);

    return new Map(
        ordered.map((category, index) => [
            category.id,
            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        ])
    );
}

export function buildCategorySlices(expensesByCategory, colorMap) {
    const sorted = [...expensesByCategory]
        .map((item) => ({
            id: item.category_id ?? null,
            name: item.category || "Sem categoria",
            value: Number(item.total),
        }))
        .sort((a, b) => b.value - a.value);

    const visible = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted;
    const folded = sorted.slice(visible.length);
    const usedColors = new Set();

    const slices = visible.map((slice) => {
        let color = slice.id === null ? NEUTRAL_CATEGORY_COLOR : colorMap.get(slice.id);

        if (!color || (color !== NEUTRAL_CATEGORY_COLOR && usedColors.has(color))) {
            color = CATEGORY_COLORS.find((candidate) => !usedColors.has(candidate)) ?? NEUTRAL_CATEGORY_COLOR;
        }

        usedColors.add(color);

        return { ...slice, key: slice.id ?? "none", color };
    });

    if (folded.length > 0) {
        slices.push({
            id: null,
            key: "others",
            name: `Outras (${folded.length})`,
            value: folded.reduce((total, slice) => total + slice.value, 0),
            color: NEUTRAL_CATEGORY_COLOR,
        });
    }

    return slices;
}
