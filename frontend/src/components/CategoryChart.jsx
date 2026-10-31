
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

import { formatCurrency } from "../utils/format";

const COLORS = [
    "#b5f56a",
    "#8bb8ff",
    "#f17c7c",
    "#c084fc",
    "#e5b567",
    "#67d5c5",
    "#f49ac2",
];

function CategoryChart({ data = [] }) {
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

            <div className="category-chart-container">
                {chartData.length > 0 ? (
                    <>
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
                                    contentStyle={{
                                        backgroundColor: "#181e1b",
                                        border: "1px solid #29312c",
                                        borderRadius: "8px",
                                        color: "#e8eae9",
                                    }}
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="category-chart-center">
                            <span>Total gasto</span>

                            <strong>
                                {formatCurrency(totalExpenses)}
                            </strong>
                        </div>
                    </>
                ) : (
                    <div className="category-chart-center">
                        <span>Sem despesas neste período</span>
                        <strong>{formatCurrency(0)}</strong>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CategoryChart;
