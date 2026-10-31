import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

const months = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Limites aceitos pela API (DashboardPeriodSerializer).
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function shiftMonth({ month, year }, step) {
    // Date resolve a virada de ano: mês 13 vira janeiro do ano seguinte.
    const date = new Date(year, month - 1 + step, 1);

    return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function PeriodPicker({ month, year, onChange }) {
    const today = new Date();
    const isCurrentMonth =
        month === today.getMonth() + 1 && year === today.getFullYear();

    const previous = shiftMonth({ month, year }, -1);
    const next = shiftMonth({ month, year }, 1);

    return (
        <div className="period-picker">
            {isCurrentMonth ? (
                <span className="period-current">
                    <span className="period-current-dot" />
                    Mês atual
                </span>
            ) : (
                <button
                    type="button"
                    className="period-today"
                    onClick={() =>
                        onChange({
                            month: today.getMonth() + 1,
                            year: today.getFullYear(),
                        })
                    }
                >
                    <RotateCcw size={14} />
                    Voltar para mês atual
                </button>
            )}

            <div className="period-control">
                <button
                    type="button"
                    className="period-arrow"
                    aria-label="Mês anterior"
                    disabled={previous.year < MIN_YEAR}
                    onClick={() => onChange(previous)}
                >
                    <ChevronLeft size={18} />
                </button>

                <span className="period-label" aria-live="polite">
                    {months[month - 1]} <span>{year}</span>
                </span>

                <button
                    type="button"
                    className="period-arrow"
                    aria-label="Próximo mês"
                    disabled={next.year > MAX_YEAR}
                    onClick={() => onChange(next)}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}

export default PeriodPicker;
