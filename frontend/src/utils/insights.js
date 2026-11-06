import { getBudgetStatus } from "./budget";
import { formatCurrency, pluralize } from "./format";

export const MONTH_NAMES = [
    "janeiro", "fevereiro", "março", "abril",
    "maio", "junho", "julho", "agosto",
    "setembro", "outubro", "novembro", "dezembro",
];

export function getGreeting(date = new Date()) {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
}

export function sumExpensesUntil(dailyMovement, untilDay = null) {
    return dailyMovement
        .filter((entry) => untilDay === null || entry.day <= untilDay)
        .reduce((total, entry) => total + Number(entry.expenses), 0);
}

// Até duas frases curtas sobre o mês, calculadas a partir dos dados.
// tone define a cor do ícone: "positive", "warning" ou "neutral".
export function findBudgetAlert(expensesByCategory, budgets) {
    const alerts = expensesByCategory
        .map((item) => ({
            name: item.category || "Sem categoria",
            status: getBudgetStatus(Number(item.total), budgets.get(item.category_id)),
        }))
        .filter((item) => item.status && item.status.level !== "ok")
        .sort((a, b) => b.status.ratio - a.status.ratio);

    return alerts[0] ?? null;
}

export function buildInsight({ summary, previousComparison, expensesByCategory, budgets = new Map(), billsSummary = null, month, year }) {
    const monthName = MONTH_NAMES[month - 1];
    const previousMonthName = MONTH_NAMES[(month + 10) % 12];

    const income = Number(summary.income);
    const expenses = Number(summary.expenses);
    const previousExpenses = Number(previousComparison?.expenses ?? 0);
    const partial = Boolean(previousComparison?.untilDay);
    const previousPeriod = partial
        ? `no mesmo período de ${previousMonthName}`
        : `em ${previousMonthName}`;

    if (income === 0 && expenses === 0) {
        return {
            tone: "neutral",
            sentences: [`Nenhuma movimentação em ${monthName} de ${year}. Que tal registrar a primeira?`],
        };
    }

    const sentences = [];
    let tone = "neutral";

    if (expenses > income) {
        tone = "warning";
        sentences.push(
            `Atenção: as despesas passaram as receitas em ${formatCurrency(expenses - income)}.`
        );
    } else if (expenses === 0) {
        tone = "positive";
        sentences.push(`Nenhuma despesa registrada em ${monthName}.`);
    } else if (previousExpenses > 0) {
        const change = Math.round(((expenses - previousExpenses) / previousExpenses) * 100);

        if (change <= -5) {
            tone = "positive";
            sentences.push(`Você gastou ${Math.abs(change)}% menos que ${previousPeriod}. Boa!`);
        } else if (change >= 5) {
            sentences.push(`Você gastou ${change}% mais que ${previousPeriod}.`);
        } else {
            sentences.push(`Seus gastos estão parecidos com os ${partial ? "do mesmo período de" : "de"} ${previousMonthName}.`);
        }
    } else {
        tone = "positive";
        sentences.push(`Seu saldo em ${monthName} está positivo em ${formatCurrency(income - expenses)}.`);
    }

    const budgetAlert = findBudgetAlert(expensesByCategory, budgets);
    const overdueBills = billsSummary?.overdue_count ?? 0;
    const pendingBills = billsSummary?.pending_count ?? 0;

    if (budgetAlert?.status.level === "over") {
        tone = "warning";
        sentences.push(
            `${budgetAlert.name} passou do orçamento em ${formatCurrency(-budgetAlert.status.remaining)}.`
        );
        return { tone, sentences };
    }

    if (overdueBills > 0) {
        tone = "warning";
        sentences.push(
            `${pluralize(overdueBills, "conta fixa está atrasada", "contas fixas estão atrasadas")}.`
        );
        return { tone, sentences };
    }

    if (budgetAlert) {
        if (tone === "positive") tone = "neutral";
        sentences.push(`${budgetAlert.name} já usou ${Math.floor(budgetAlert.status.ratio * 100)}% do orçamento.`);
        return { tone, sentences };
    }

    if (pendingBills > 0) {
        sentences.push(`Faltam ${formatCurrency(billsSummary.pending_total)} em contas fixas este mês.`);
        return { tone, sentences };
    }

    const topCategory = [...expensesByCategory].sort(
        (a, b) => Number(b.total) - Number(a.total)
    )[0];

    if (topCategory) {
        sentences.push(
            `${topCategory.category || "Sem categoria"} foi sua maior despesa: ${formatCurrency(topCategory.total)}.`
        );
    }

    return { tone, sentences };
}
