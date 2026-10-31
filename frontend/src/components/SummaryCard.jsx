import { Skeleton } from "./Skeleton";
import { useCountUp } from "../hooks/useCountUp";
import { formatCurrency } from "../utils/format";

// value: número (ou null quando indisponível). Ao trocar de período,
// o valor "corre" até o novo número em vez de trocar de repente.
// tone: "positive" ou "negative" pinta o valor (usado no saldo).
function SummaryCard({ title, value, description, icon, variant, tone, loading = false }) {
    const animatedValue = useCountUp(value);

    return (
        <article className={`summary-card ${variant}`}>
            <div className="summary-card-top">
                <span>{title}</span>
                {icon}
            </div>

            {loading && value == null ? (
                <Skeleton width="60%" height={30} className="summary-card-skeleton" />
            ) : (
                <h2 className={tone || undefined}>
                    {animatedValue == null ? "Indisponível" : formatCurrency(animatedValue)}
                </h2>
            )}

            <p>{description}</p>
        </article>
    );
}

export default SummaryCard;
