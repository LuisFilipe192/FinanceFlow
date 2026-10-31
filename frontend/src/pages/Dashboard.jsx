import { useEffect, useState } from "react";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
} from "lucide-react";

import SummaryCard from "../components/SummaryCard";
import Select from "../components/Select";

import MonthlyChart from "../components/MonthlyChart";
import CategoryChart from "../components/CategoryChart";

import { formatCurrency } from "../utils/format";
import { getDashboard } from "../services/dashboard";

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro",
];

const monthOptions = months.map((name, index) => ({
    value: index + 1,
    label: name,
}));

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

    const yearOptions = Array.from(
        { length: 11 },
        (_, index) => today.getFullYear() - 5 + index
    ).map((value) => ({ value, label: String(value) }));

    const displayValue = (value) => {
        if (loading) return "Carregando...";
        if (error || !summary) return "Indisponível";

        return formatCurrency(value);
    };

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

                    <div className="period-selector">
                        <Select
                            className="period-dropdown"
                            value={month}
                            options={monthOptions}
                            onChange={setMonth}
                        />

                        <Select
                            className="period-dropdown"
                            value={year}
                            options={yearOptions}
                            onChange={setYear}
                        />
                    </div>
                </div>

                <div className="summary-grid">
                    <SummaryCard
                        title="Receitas"
                        amount={displayValue(summary?.income)}
                        description="Total de entradas"
                        icon={<ArrowDownLeft />}
                        variant="income"
                    />

                    <SummaryCard
                        title="Despesas"
                        amount={displayValue(summary?.expenses)}
                        description="Total de saídas"
                        icon={<ArrowUpRight />}
                        variant="expense"
                    />

                    <SummaryCard
                        title="Saldo do período"
                        amount={displayValue(summary?.balance)}
                        description="Receitas menos despesas"
                        icon={<Wallet />}
                        variant="balance"
                    />
                </div>
            </section>

            <section className="analytics-section">
                <MonthlyChart data={dailyMovement} />
            </section>

            <section className="analytics-section">
                <CategoryChart data={expensesByCategory} />
            </section>
        </>
    );
}

export default Dashboard;
