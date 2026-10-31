import { formatCurrency } from "./format";

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

// Até duas frases curtas sobre o mês, calculadas a partir dos dados.
// tone define a cor do ícone: "positive", "warning" ou "neutral".
export function buildInsight({ summary, previousSummary, expensesByCategory, month, year }) {
    const monthName = MONTH_NAMES[month - 1];
    const previousMonthName = MONTH_NAMES[(month + 10) % 12];

    const income = Number(summary.income);
    const expenses = Number(summary.expenses);
    const previousExpenses = Number(previousSummary?.expenses ?? 0);

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
            sentences.push(`Você gastou ${Math.abs(change)}% menos que em ${previousMonthName}. Boa!`);
        } else if (change >= 5) {
            sentences.push(`Você gastou ${change}% mais que em ${previousMonthName}.`);
        } else {
            sentences.push(`Seus gastos estão parecidos com os de ${previousMonthName}.`);
        }
    } else {
        tone = "positive";
        sentences.push(`Seu saldo em ${monthName} está positivo em ${formatCurrency(income - expenses)}.`);
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
