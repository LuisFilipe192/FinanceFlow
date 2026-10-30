
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SummaryCard from "../components/SummaryCard";

import MonthlyChart from "../components/MonthlyChart";
import CategoryChart from "../components/CategoryChart";

function Dashboard() {
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
                    </div>

                    <div className="summary-grid">
                        <SummaryCard
                            title="Receitas"
                            amount="R$ 0,00"
                            description="Total de entradas"
                            icon={<ArrowDownLeft />}
                            variant="income"
                        />

                        <SummaryCard
                            title="Despesas"
                            amount="R$ 4,30"
                            description="Total de saídas"
                            icon={<ArrowUpRight />}
                            variant="expense"
                        />

                        <SummaryCard
                            title="Saldo atual"
                            amount="-R$ 4,30"
                            description="Receitas menos despesas"
                            icon={<Wallet />}
                            variant="balance"
                        />
                    </div>
                </section>

                <section className="analytics-section">
                    <MonthlyChart />
                </section>
                <section className="analytics-section">
                    <CategoryChart />
                </section>
            </main>
        </div>
    );
}

export default Dashboard;
