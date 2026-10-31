
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from "recharts";

import { Skeleton } from "./Skeleton";
import { formatCurrency } from "../utils/format";
import { chartTooltipStyle } from "./chartStyles";

const COLORS = [
    "#b5f56a",
    "#8bb8ff",
    "#f17c7c",
    "#c084fc",
    "#e5b567",
    "#67d5c5",
    "#f49ac2",
];

function CategoryChart({ data = [], loading = false }) {
    const chartData = data.map((category, index) => ({
        name: category.category || "Sem categoria",
        value: Number(category.total),
        color: COLORS[index % COLORS.length],
    }));

    const totalExpenses = chartData.reduce(
        (total, category) => total + category.value,
        0
    );

    return (
        <div className="category-chart-card">
            <div className="chart-header">
                <span className="section-overline">
                    EXPENSE BREAKDOWN
                </span>

                <h2>Despesas por categoria</h2>

                <p>Distribuição dos seus gastos</p>
            </div>

            {loading ? (
                <div className="category-chart-layout">
                    <div className="category-chart-container">
                        <Skeleton width={220} height={220} className="skeleton-donut" />
                    </div>
                </div>
            ) : chartData.length > 0 ? (
                <div className="category-chart-layout">
                    <div className="category-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={110}
                                    paddingAngle={4}
                                    stroke="none"
                                >
                                    {chartData.map((category) => (
                                        <Cell
                                            key={category.name}
                                            fill={category.color}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip
                                    formatter={(value) => [
                                        formatCurrency(value),
                                        "Total",
                                    ]}
                                    {...chartTooltipStyle}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="category-chart-center">
                            <span>Total gasto</span>

                            <strong>
                                {formatCurrency(totalExpenses)}
                            </strong>
                        </div>
                    </div>

                    <ul className="category-legend">
                        {chartData.map((category) => (
                            <li key={category.name}>
                                <span
                                    className="category-legend-dot"
                                    style={{ background: category.color }}
                                />

                                <span className="category-legend-name">
                                    {category.name}
                                </span>

                                <span className="category-legend-value">
                                    {formatCurrency(category.value)}
                                </span>

                                <span className="category-legend-percent">
                                    {Math.round((category.value / totalExpenses) * 100)}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="chart-empty">
                    <strong>Sem despesas neste período</strong>
                    <span>Quando você registrar gastos, eles aparecem aqui por categoria.</span>
                </div>
            )}
        </div>
    );
}

export default CategoryChart;
