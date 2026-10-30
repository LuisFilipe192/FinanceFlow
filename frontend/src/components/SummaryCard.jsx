
function SummaryCard({ title, amount, description, icon, variant }) {
    return (
        <article className={`summary-card ${variant}`}>
            <div className="summary-card-top">
                <span>{title}</span>
                {icon}
            </div>

            <h2>{amount}</h2>

            <p>{description}</p>
        </article>
    );
}

export default SummaryCard;
