import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import { Skeleton } from "./Skeleton";
import { formatCompactCurrency, formatCurrency } from "../utils/format";
import { chartTooltipStyle } from "./chartStyles";

const AXIS_TICK = { fill: "var(--text-secondary)", fontSize: 12 };

const SERIES = [
    { key: "receitas", label: "Receitas", color: "var(--accent)" },
    { key: "despesas", label: "Despesas", color: "var(--danger)" },
];

function MonthlyChart({ data = [], loading = false }) {
    const chartData = data.map((item) => ({
        day: String(item.day).padStart(2, "0"),
        receitas: Number(item.income),
        despesas: Number(item.expenses),
    }));

    const hasMovement = chartData.some((item) => item.receitas > 0 || item.despesas > 0);

    return (
        <div className="chart-card">
            <div className="chart-header chart-header-row">
                <div>
                    <h2>Movimentação mensal</h2>
                    <p>Receitas e despesas por dia</p>
                </div>

                {hasMovement && !loading && (
                    <ul className="chart-legend">
                        {SERIES.map((series) => (
                            <li key={series.key}>
                                <span className="chart-legend-dot" style={{ background: series.color }} />
                                {series.label}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="chart-container">
                {loading ? (
                    <Skeleton height="100%" className="skeleton-chart" />
                ) : hasMovement ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                            barGap={2}
                        >
                            <CartesianGrid stroke="var(--border)" vertical={false} />

                            <XAxis
                                dataKey="day"
                                tick={AXIS_TICK}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={12}
                            />

                            <YAxis
                                tick={AXIS_TICK}
                                tickLine={false}
                                axisLine={false}
                                width={72}
                                tickFormatter={formatCompactCurrency}
                            />

                            <Tooltip
                                {...chartTooltipStyle}
                                cursor={{ fill: "var(--surface-stripe)" }}
                                labelFormatter={(day) => `Dia ${day}`}
                                formatter={(value, name) => [formatCurrency(value), name]}
                            />

                            {SERIES.map((series) => (
                                <Bar
                                    key={series.key}
                                    dataKey={series.key}
                                    name={series.label}
                                    fill={series.color}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={16}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="chart-empty">
                        <strong>Nenhuma movimentação neste mês</strong>
                        <span>Receitas e despesas aparecem aqui, dia a dia, assim que você registrar.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MonthlyChart;
