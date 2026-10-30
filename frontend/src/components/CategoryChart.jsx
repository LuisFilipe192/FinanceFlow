
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend
} from "recharts";

const data = [
    { name: "Alimentação", value: 1200, color: "#b5f56a" },
    { name: "Transporte", value: 450, color: "#8bb8ff" },
    { name: "Moradia", value: 1800, color: "#f17c7c" },
    { name: "Lazer", value: 600, color: "#c084fc" },
    { name: "Outros", value: 350, color: "#e5b567" },
];

function CategoryChart() {
    const totalExpenses = data.reduce(
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
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={110}
                            paddingAngle={4}
                            stroke="none"
                        >
                            {data.map((category) => (
                                <Cell
                                    key={category.name}
                                    fill={category.color}
                                />
                            ))}
                        </Pie>

                        <Tooltip
                            formatter={(value) => [
                                `R$ ${Number(value).toLocaleString("pt-BR")}`,
                                "Total"
                            ]}
                            contentStyle={{
                                backgroundColor: "#181e1b",
                                border: "1px solid #29312c",
                                borderRadius: "8px",
                                color: "#e8eae9"
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
                        R$ {totalExpenses.toLocaleString("pt-BR")}
                    </strong>
                </div>
            </div>
        </div>
    );
}

export default CategoryChart;
