// Estilo do tooltip do Recharts. É estilo inline (style=), por isso aceita
// as variáveis de cor do index.css e acompanha a paleta do app.
export const chartTooltipStyle = {
    contentStyle: {
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        color: "var(--text-primary)",
    },
    itemStyle: {
        color: "var(--text-primary)",
    },
    labelStyle: {
        color: "var(--text-secondary)",
    },
};
