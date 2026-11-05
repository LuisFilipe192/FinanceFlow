export const BUDGET_WARNING_RATIO = 0.8;

export function getBudgetStatus(spent, budget) {
    const limit = Number(budget);

    if (!limit || limit <= 0) return null;

    const ratio = spent / limit;

    return {
        ratio,
        remaining: limit - spent,
        level: spent > limit ? "over" : ratio >= BUDGET_WARNING_RATIO ? "warning" : "ok",
    };
}
