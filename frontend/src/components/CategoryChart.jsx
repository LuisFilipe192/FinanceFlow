
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from "recharts";

import { Skeleton } from "./Skeleton";
import { formatCurrency } from "../utils/format";
import { buildCategorySlices } from "../utils/categoryColors";

function CategoryTooltip({ active, payload, total }) {
    if (!active || !payload?.length) return null;

    const slice = payload[0].payload;

    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip-row">
                <span className="chart-legend-dot" style={{ background: slice.color }} />
                <span>{slice.name}</span>
            </div>
            <strong className="chart-tooltip-value">
                {formatCurrency(slice.value)}
                <span> · {Math.round((slice.value / total) * 100)}%</span>
            </strong>
        </div>
    );
}

function CategoryChart({ data = [], colorMap = new Map(), loading = false }) {
    const chartData = buildCategorySlices(data, colorMap);

    const totalExpenses = chartData.reduce(
        (total, category) => total + category.value,
        0
    );

    return (
        <div className="category-chart-card">
            <div className="chart-header">
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
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {chartData.map((category) => (
                                        <Cell
                                            key={category.key}
                                            fill={category.color}
                                        />
                                    ))}
                                </Pie>

                                <Tooltip
                                    content={<CategoryTooltip total={totalExpenses} />}
                                    isAnimationActive={false}
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
                            <li key={category.key}>
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
