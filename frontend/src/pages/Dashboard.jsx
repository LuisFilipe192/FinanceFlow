import { useEffect, useState } from "react";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
} from "lucide-react";

import SummaryCard from "../components/SummaryCard";
import PeriodPicker from "../components/PeriodPicker";

import MonthlyChart from "../components/MonthlyChart";
import CategoryChart from "../components/CategoryChart";

import { formatCurrency } from "../utils/format";
import { getDashboard } from "../services/dashboard";

function Dashboard() {
    const today = new Date();

    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    const [summary, setSummary] = useState(null);
    const [dailyMovement, setDailyMovement] = useState([]);
    const [expensesByCategory, setExpensesByCategory] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function loadDashboard() {
            try {
                setLoading(true);
                setError(null);

                const data = await getDashboard({
                    month,
                    year,
                    signal: controller.signal,
                });

                setSummary(data.summary);
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

    const displayValue = (value) => {
        if (error || !summary) return "Indisponível";

        return formatCurrency(value);
    };

    const balance = Number(summary?.balance ?? 0);
    const balanceTone = error || !summary || balance === 0
        ? undefined
        : balance > 0 ? "positive" : "negative";

    return (
        <>
            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-overline">
                            01 / FINANCIAL SUMMARY
                        </span>
                        <h2>Resumo financeiro</h2>
                    </div>

                    <PeriodPicker
                        month={month}
                        year={year}
                        onChange={(period) => {
                            setMonth(period.month);
                            setYear(period.year);
                        }}
                    />
                </div>

                <div className="summary-grid">
                    <SummaryCard
                        title="Receitas"
                        amount={displayValue(summary?.income)}
                        description="Total de entradas"
                        icon={<ArrowDownLeft />}
                        variant="income"
                        loading={loading}
                    />

                    <SummaryCard
                        title="Despesas"
                        amount={displayValue(summary?.expenses)}
                        description="Total de saídas"
                        icon={<ArrowUpRight />}
                        variant="expense"
                        loading={loading}
                    />

                    <SummaryCard
                        title="Saldo do período"
                        amount={displayValue(summary?.balance)}
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
                <CategoryChart data={expensesByCategory} loading={loading} />
            </section>
        </>
    );
}

export default Dashboard;
