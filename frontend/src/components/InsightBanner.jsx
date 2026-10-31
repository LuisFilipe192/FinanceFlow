import { AlertTriangle, CircleCheck, Sparkles } from "lucide-react";

import { Skeleton } from "./Skeleton";
import { buildInsight, getGreeting } from "../utils/insights";

const ICONS = {
    positive: CircleCheck,
    warning: AlertTriangle,
    neutral: Sparkles,
};

function InsightBanner({ loading, summary, previousSummary, expensesByCategory, month, year }) {
    if (loading && !summary) {
        return (
            <div className="insight-banner">
                <Skeleton width={36} height={36} className="insight-icon-skeleton" />
                <Skeleton width="55%" height={14} />
            </div>
        );
    }

    if (!summary) return null;

    const { tone, sentences } = buildInsight({
        summary,
        previousSummary,
        expensesByCategory,
        month,
        year,
    });

    const Icon = ICONS[tone];

    return (
        // key reinicia a animação de entrada a cada novo período.
        <div className={`insight-banner ${tone}`} key={`${month}-${year}`} aria-live="polite">
            <div className="insight-icon">
                <Icon size={18} />
            </div>

            <p>
                <strong>{getGreeting()}!</strong> {sentences.join(" ")}
            </p>
        </div>
    );
}

export default InsightBanner;
