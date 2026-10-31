import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";

import { formatCurrency, formatDayLabel, formatWeekday } from "../../utils/format";

// Mesma ordem da API (data mais recente, depois id maior). Reordenar aqui
// garante que uma transação criada ou editada com outra data caia no dia certo.
function groupByDay(transactions) {
    const sorted = [...transactions].sort((a, b) =>
        b.date.localeCompare(a.date) || b.id - a.id
    );

    const groups = [];

    for (const transaction of sorted) {
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && lastGroup.date === transaction.date) {
            lastGroup.items.push(transaction);
        } else {
            groups.push({ date: transaction.date, items: [transaction] });
        }
    }

    return groups;
}

// Entradas e saídas separadas: um saldo "+ R$ 0,00" esconderia que houve
// movimento no dia.
function getDayTotals(items) {
    return items.reduce(
        (totals, transaction) => {
            const amount = Number(transaction.amount);

            if (transaction.type === "INCOME") {
                totals.income += amount;
            } else {
                totals.expenses += amount;
            }

            return totals;
        },
        { income: 0, expenses: 0 }
    );
}

function TransactionList({ transactions, onEdit, onDelete, highlightId }) {
    const groups = groupByDay(transactions);

    return (
        <div className="transactions-list">
            {groups.map((group) => {
                const totals = getDayTotals(group.items);
                const dayLabel = formatDayLabel(group.date);

                return (
                    <section className="transaction-group" key={group.date}>
                        <header className="transaction-group-header">
                            <div className="transaction-group-day">
                                <strong>{dayLabel}</strong>
                                <span>{formatWeekday(group.date)}</span>
                            </div>

                            <div className="transaction-group-totals">
                                {totals.income > 0 && (
                                    <span className="income">
                                        + {formatCurrency(totals.income)}
                                    </span>
                                )}

                                {totals.expenses > 0 && (
                                    <span className="expense">
                                        − {formatCurrency(totals.expenses)}
                                    </span>
                                )}
                            </div>
                        </header>

                        {group.items.map((transaction) => {
                            const isIncome = transaction.type === "INCOME";
                            const variant = isIncome ? "income" : "expense";

                            return (
                                <div
                                    className={`transaction-row ${
                                        transaction.id === highlightId ? "is-highlighted" : ""
                                    }`}
                                    key={transaction.id}
                                >
                                    <div className={`transaction-icon ${variant}`}>
                                        {isIncome ? (
                                            <ArrowDownLeft size={20} />
                                        ) : (
                                            <ArrowUpRight size={20} />
                                        )}
                                    </div>

                                    <div className="transaction-info">
                                        <strong>{transaction.description}</strong>

                                        <div className="transaction-meta">
                                            <span>{transaction.category_name || "Sem categoria"}</span>
                                        </div>
                                    </div>

                                    <div className="transaction-details">
                                        <strong className={`transaction-amount ${variant}`}>
                                            {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
                                        </strong>

                                        {/* Selo e ações dividem o mesmo espaço: no hover
                                            o selo some e as ações aparecem no lugar. */}
                                        <div className="transaction-trailing">
                                            <span className={`transaction-type ${variant}`}>
                                                {isIncome ? "Receita" : "Despesa"}
                                            </span>

                                            <div className="row-actions">
                                                <button
                                                    type="button"
                                                    className="row-action"
                                                    aria-label={`Editar ${transaction.description}`}
                                                    title="Editar"
                                                    onClick={() => onEdit(transaction)}
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="row-action danger"
                                                    aria-label={`Excluir ${transaction.description}`}
                                                    title="Excluir"
                                                    onClick={() => onDelete(transaction)}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                );
            })}
        </div>
    );
}

export default TransactionList;
