import { useEffect, useState, useRef } from "react";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Wallet,
    ChevronDown
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SummaryCard from "../components/SummaryCard";

import MonthlyChart from "../components/MonthlyChart";
import CategoryChart from "../components/CategoryChart";

import { getDashboard } from "../services/dashboard";

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro",
];

function Dashboard() {
    const today = new Date();

    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    const [summary, setSummary] = useState(null);
    const [dailyMovement, setDailyMovement] = useState([]);
    const [expensesByCategory, setExpensesByCategory] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [openPeriodDropdown, setOpenPeriodDropdown] = useState(null);
    const periodSelectorRef = useRef(null);

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

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                periodSelectorRef.current &&
                !periodSelectorRef.current.contains(event.target)
            ) {
                setOpenPeriodDropdown(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
}, []);

    const formatCurrency = (value) => {
        return Number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    };

    const displayValue = (value) => {
        if (loading) return "Carregando...";
        if (error || !summary) return "Indisponível";

        return formatCurrency(value);
    };

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="main-content">
                <Header />

                <section className="dashboard-section">
                    <div className="section-heading">
                        <div>
                            <span className="section-overline">
                                01 / FINANCIAL SUMMARY
                            </span>
                            <h2>Resumo financeiro</h2>
                        </div>

                        <div className="period-selector" ref={periodSelectorRef}>
                        <div className="category-dropdown period-dropdown">
                            <button
                                type="button"
                                className={`category-dropdown-trigger ${
                                    openPeriodDropdown === "month" ? "open" : ""
                                }`}
                                onClick={() =>
                                    setOpenPeriodDropdown(
                                        openPeriodDropdown === "month" ? null : "month"
                                    )
                                }
                            >
                                <span>{months[month - 1]}</span>
                                <ChevronDown size={18} />
                            </button>

                            {openPeriodDropdown === "month" && (
                                <div className="category-dropdown-menu">
                                    {months.map((name, index) => (
                                        <button
                                            type="button"
                                            key={name}
                                            className={`category-dropdown-option ${
                                                month === index + 1 ? "selected" : ""
                                            }`}
                                            onClick={() => {
                                                setMonth(index + 1);
                                                setOpenPeriodDropdown(null);
                                            }}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dropdown de ano */}
                        <div className="category-dropdown period-dropdown">
                            <button
                                type="button"
                                className={`category-dropdown-trigger ${
                                    openPeriodDropdown === "year" ? "open" : ""
                                }`}
                                onClick={() =>
                                    setOpenPeriodDropdown(
                                        openPeriodDropdown === "year" ? null : "year"
                                    )
                                }
                            >
                                <span>{year}</span>
                                <ChevronDown size={18} />
                            </button>

                            {openPeriodDropdown === "year" && (
                                <div className="category-dropdown-menu">
                                    {Array.from(
                                        { length: 11 },
                                        (_, index) => today.getFullYear() - 5 + index
                                    ).map((value) => (
                                        <button
                                            type="button"
                                            key={value}
                                            className={`category-dropdown-option ${
                                                year === value ? "selected" : ""
                                            }`}
                                            onClick={() => {
                                                setYear(value);
                                                setOpenPeriodDropdown(null);
                                            }}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

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
            </main>
        </div>
    );
}

export default Dashboard;
