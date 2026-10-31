// Bloco cinza animado que ocupa o lugar do conteúdo enquanto ele carrega.
// Mantém o tamanho da página estável: nada "pula" quando os dados chegam.
export function Skeleton({ width = "100%", height = 14, className = "" }) {
    return (
        <span
            className={`skeleton ${className}`}
            style={{ width, height }}
            aria-hidden="true"
        />
    );
}

export function SkeletonRows({ rows = 4 }) {
    return (
        <div className="transactions-list" aria-busy="true" aria-label="Carregando">
            {Array.from({ length: rows }, (_, index) => (
                <div className="transaction-row skeleton-row" key={index}>
                    <Skeleton width={46} height={46} className="skeleton-icon" />

                    <div className="transaction-info">
                        <Skeleton width="45%" height={15} />
                        <Skeleton width="25%" height={12} />
                    </div>

                    <Skeleton width={90} height={15} />
                </div>
            ))}
        </div>
    );
}
