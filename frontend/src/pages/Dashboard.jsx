import { useEffect, useState } from "react";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
} from "lucide-react";

import SummaryCard from "../components/SummaryCard";
import InsightBanner from "../components/InsightBanner";
import PeriodPicker from "../components/PeriodPicker";
import PageActions from "../components/PageActions";

import MonthlyChart from "../components/MonthlyChart";
import CategoryChart from "../components/CategoryChart";

import { getDashboard } from "../services/dashboard";
import { getFixedBills } from "../services/fixedBills";
import { getCategories } from "../services/transactions";
import { getCategoryColorMap } from "../utils/categoryColors";
import { sumExpensesUntil } from "../utils/insights";

function Dashboard() {
    const today = new Date();

    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    const [summary, setSummary] = useState(null);
    const [previousComparison, setPreviousComparison] = useState(null);
    // Período a que os dados na tela pertencem (muda só quando a resposta chega).
    const [loadedPeriod, setLoadedPeriod] = useState({ month, year });
    const [dailyMovement, setDailyMovement] = useState([]);
    const [expensesByCategory, setExpensesByCategory] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categoryColors, setCategoryColors] = useState(() => new Map());
    const [budgets, setBudgets] = useState(() => new Map());
    const [billsSummary, setBillsSummary] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        getCategories({ signal: controller.signal })
            .then((categories) => {
                setCategoryColors(getCategoryColorMap(categories));
                setBudgets(new Map(categories.map((category) => [category.id, category.monthly_budget])));
            })
            .catch((requestError) => {
                if (requestError.name !== "AbortError") console.error(requestError);
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function loadDashboard() {
            try {
                setLoading(true);
                setError(null);

                // O mês anterior alimenta a comparação do resumo ("gastou 18% menos").
                const previous = new Date(year, month - 2, 1);

                const [data, previousData, billsData] = await Promise.all([
                    getDashboard({ month, year, signal: controller.signal }),
                    getDashboard({
                        month: previous.getMonth() + 1,
                        year: previous.getFullYear(),
                        signal: controller.signal,
                    }).catch(() => null),
                    getFixedBills({ month, year, signal: controller.signal }).catch(() => null),
                ]);

                const now = new Date();
                const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
                const untilDay = isCurrentMonth ? now.getDate() : null;

                setSummary(data.summary);
                setBillsSummary(isCurrentMonth ? billsData?.summary ?? null : null);
                setPreviousComparison(
                    previousData
                        ? { expenses: sumExpensesUntil(previousData.daily_movement, untilDay), untilDay }
                        : null
                );
                setLoadedPeriod({ month, year });
                setDailyMovement(data.daily_movement);
                setExpensesByCategory(data.expenses_by_category);

            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Erro na API:", error);
                    setError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => controller.abort();
    }, [month, year]);

    // null = indisponível. O card mostra o esqueleto só no primeiro carregamento;
    // ao trocar de mês, o valor antigo "corre" até o novo.
    const valueOf = (field) => (error || !summary ? null : Number(summary[field]));

    const balance = Number(summary?.balance ?? 0);
    const balanceTone = error || !summary || balance === 0
        ? undefined
        : balance > 0 ? "positive" : "negative";

    return (
        <>
            <PageActions>
                <PeriodPicker
                    month={month}
                    year={year}
                    onChange={(period) => {
                        setMonth(period.month);
                        setYear(period.year);
                    }}
                />
            </PageActions>

            <section className="dashboard-section">

                <InsightBanner
                    loading={loading}
                    summary={error ? null : summary}
                    previousComparison={previousComparison}
                    budgets={budgets}
                    billsSummary={billsSummary}
                    expensesByCategory={expensesByCategory}
                    month={loadedPeriod.month}
                    year={loadedPeriod.year}
                />

                <div className="summary-grid">
                    <SummaryCard
                        title="Receitas"
                        value={valueOf("income")}
                        description="Total de entradas"
                        icon={<ArrowDownLeft />}
                        variant="income"
                        loading={loading}
                    />

                    <SummaryCard
                        title="Despesas"
                        value={valueOf("expenses")}
                        description="Total de saídas"
                        icon={<ArrowUpRight />}
                        variant="expense"
                        loading={loading}
                    />

                    <SummaryCard
                        title="Saldo do período"
                        value={valueOf("balance")}
                        description={
                            balanceTone === "negative"
                                ? "Você gastou mais do que recebeu"
                                : "Receitas menos despesas"
                        }
                        icon={<Wallet />}
                        variant="balance"
                        tone={balanceTone}
                        loading={loading}
                    />
                </div>
            </section>

            <section className="analytics-section">
                <MonthlyChart data={dailyMovement} loading={loading} />
            </section>

            <section className="analytics-section">
                <CategoryChart data={expensesByCategory} colorMap={categoryColors} loading={loading} />
            </section>
        </>
    );
}

export default Dashboard;
