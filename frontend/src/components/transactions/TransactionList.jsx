import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";

import { formatCurrency, formatDate } from "../../utils/format";

function TransactionList({ transactions, onEdit, onDelete }) {
    return (
        <div className="transactions-list">
            {transactions.map((transaction) => {
                const isIncome = transaction.type === "INCOME";
                const variant = isIncome ? "income" : "expense";

                return (
                    <div className="transaction-row" key={transaction.id}>
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
                                <span className="transaction-date">
                                    {formatDate(transaction.date)}
                                </span>
                            </div>
                        </div>

                        <div className="transaction-details">
                            <strong className={`transaction-amount ${variant}`}>
                                {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
                            </strong>

                            <span className={`transaction-type ${variant}`}>
                                {isIncome ? "Receita" : "Despesa"}
                            </span>

                            <div className="transaction-actions">
                                <button
                                    type="button"
                                    className="transaction-edit-button"
                                    onClick={() => onEdit(transaction)}
                                >
                                    <Pencil size={14} />
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    className="transaction-delete-button"
                                    onClick={() => onDelete(transaction)}
                                >
                                    <Trash2 size={14} />
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default TransactionList;
