
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import { Skeleton } from "./Skeleton";
import { formatCurrency } from "../utils/format";
import { chartTooltipStyle } from "./chartStyles";

function MonthlyChart({ data = [], loading = false }) {
    const chartData = data.map((item) => ({
        day: String(item.day).padStart(2, "0"),
        receitas: Number(item.income),
        despesas: Number(item.expenses),
    }));

    return (
        <div className="chart-card">
            <div className="chart-header">
                <div>
                    <span className="section-overline">
                        FINANCIAL PERFORMANCE
                    </span>

                    <h2>Movimentação mensal</h2>
                    <p>Receitas e despesas por dia</p>
                </div>
            </div>

            <div className="chart-container">
                {loading ? (
                    <Skeleton height="100%" className="skeleton-chart" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid
                                stroke="#29312c"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="day"
                                stroke="#929b95"
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />

                            <YAxis
                                stroke="#929b95"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) =>
                                    `R$ ${value.toLocaleString("pt-BR")}`
                                }
                            />

                            <Tooltip
                                {...chartTooltipStyle}
                                cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                                labelFormatter={(day) => `Dia ${day}`}
                                formatter={(value, name) => [
                                    formatCurrency(value),
                                    name,
                                ]}
                            />

                            <Legend />

                            <Bar
                                dataKey="receitas"
                                name="Receitas"
                                fill="#b5f56a"
                                radius={[5, 5, 0, 0]}
                            />

                            <Bar
                                dataKey="despesas"
                                name="Despesas"
                                fill="#f17c7c"
                                radius={[5, 5, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export default MonthlyChart;
