import { Skeleton } from "./Skeleton";

// tone: "positive" ou "negative" pinta o valor (usado no saldo).
function SummaryCard({ title, amount, description, icon, variant, tone, loading = false }) {
    return (
        <article className={`summary-card ${variant}`}>
            <div className="summary-card-top">
                <span>{title}</span>
                {icon}
            </div>

            {loading ? (
                <Skeleton width="60%" height={30} className="summary-card-skeleton" />
            ) : (
                <h2 className={tone || undefined}>{amount}</h2>
            )}

            <p>{description}</p>
        </article>
    );
}

export default SummaryCard;
