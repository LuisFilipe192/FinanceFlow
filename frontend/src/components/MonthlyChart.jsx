
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";

const data = [
    { month: "Jan", receitas: 4500, despesas: 2800 },
    { month: "Fev", receitas: 5200, despesas: 3100 },
    { month: "Mar", receitas: 4800, despesas: 3500 },
    { month: "Abr", receitas: 6100, despesas: 2900 },
    { month: "Mai", receitas: 5500, despesas: 3800 },
    { month: "Jun", receitas: 7000, despesas: 4200 },
];

function MonthlyChart() {
    return (
        <div className="chart-card">
            <div className="chart-header">
                <div>
                    <span className="section-overline">
                        FINANCIAL PERFORMANCE
                    </span>

                    <h2>Fluxo financeiro</h2>
                    <p>Receitas e despesas ao longo dos meses</p>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid
                            stroke="#29312c"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="month"
                            stroke="#929b95"
                            tickLine={false}
                            axisLine={false}
                        />

                        <YAxis
                            stroke="#929b95"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `R$ ${value / 1000}k`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#181e1b",
                                border: "1px solid #29312c",
                                borderRadius: "8px",
                                color: "#e8eae9"
                            }}
                            formatter={(value) => [
                                `R$ ${Number(value).toLocaleString("pt-BR")}`,
                                undefined
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
            </div>
        </div>
    );
}

export default MonthlyChart;
