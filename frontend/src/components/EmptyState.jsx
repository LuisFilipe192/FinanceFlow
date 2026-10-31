function EmptyState({ icon, title, description, action }) {
    return (
        <div className="transactions-empty">
            {icon && <div className="empty-icon">{icon}</div>}

            <h3>{title}</h3>

            {description && <p>{description}</p>}

            {action}
        </div>
    );
}

export default EmptyState;
