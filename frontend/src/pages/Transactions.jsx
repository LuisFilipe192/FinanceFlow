import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Search } from "lucide-react";

import ConfirmDialog from "../components/ConfirmDialog";
import TransactionFormModal from "../components/transactions/TransactionFormModal";
import TransactionList from "../components/transactions/TransactionList";
import { formatCurrency } from "../utils/format";
import { getDashboard } from "../services/dashboard";
import {
    getTransactions,
    getCategories,
    deleteTransaction,
} from "../services/transactions";

function getCurrentPeriod() {
    const today = new Date();

    return {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
    };
}

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [summary, setSummary] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    // showForm abre o modal; editingTransaction diz se é edição (objeto) ou criação (null).
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [deletingTransaction, setDeletingTransaction] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                const [transactionData, categoryData, dashboardData] = await Promise.all([
                    getTransactions(),
                    getCategories(),
                    getDashboard(getCurrentPeriod()),
                ]);

                setTransactions(transactionData);
                setCategories(categoryData);
                setSummary(dashboardData.summary);
            } catch (error) {
                console.error(error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    async function refreshFinancialSummary() {
        try {
            const dashboardData = await getDashboard(getCurrentPeriod());
            setSummary(dashboardData.summary);
        } catch (error) {
            console.error("Erro ao atualizar indicadores:", error);
        }
    }

    function openCreateForm() {
        setEditingTransaction(null);
        setShowForm(true);
    }

    function openEditForm(transaction) {
        setEditingTransaction(transaction);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingTransaction(null);
    }

    async function handleTransactionSaved(savedTransaction, isEditing) {
        setTransactions((previous) =>
            isEditing
                ? previous.map((transaction) =>
                    transaction.id === savedTransaction.id
                        ? savedTransaction
                        : transaction
                )
                : [savedTransaction, ...previous]
        );

        await refreshFinancialSummary();
        closeForm();
    }

    function closeDeleteDialog() {
        setTransactionToDelete(null);
        setDeleteError("");
    }

    async function handleDeleteTransaction() {
        if (!transactionToDelete) return;

        try {
            setDeletingTransaction(true);
            setDeleteError("");

            await deleteTransaction(transactionToDelete.id);

            setTransactions((previous) =>
                previous.filter(
                    (transaction) => transaction.id !== transactionToDelete.id
                )
            );

            closeDeleteDialog();
            await refreshFinancialSummary();
        } catch (error) {
            console.error(error);
            setDeleteError("Não foi possível excluir a transação. Tente novamente.");
        } finally {
            setDeletingTransaction(false);
        }
    }

    const filteredTransactions = transactions.filter((transaction) =>
        transaction.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-overline">
                            02 / FINANCIAL MANAGEMENT
                        </span>
                        <h2>Transações</h2>
                        <p>Gerencie suas receitas e despesas.</p>
                    </div>

                    <button className="primary-button" onClick={openCreateForm}>
                        <Plus size={18} />
                        Nova transação
                    </button>
                </div>

                <div className="transaction-summary">
                    <div className="transaction-summary-card">
                        <div className="summary-card-top">
                            <span>Receitas do mês</span>
                            <div className="summary-icon income">
                                <ArrowDownLeft size={18} />
                            </div>
                        </div>

                        <strong className="income">
                            {formatCurrency(summary.income)}
                        </strong>

                        <span className="summary-description">
                            Total recebido neste mês
                        </span>
                    </div>

                    <div className="transaction-summary-card">
                        <div className="summary-card-top">
                            <span>Despesas do mês</span>
                            <div className="summary-icon expense">
                                <ArrowUpRight size={18} />
                            </div>
                        </div>

                        <strong className="expense">
                            {formatCurrency(summary.expenses)}
                        </strong>

                        <span className="summary-description">
                            Total gasto neste mês
                        </span>
                    </div>
                </div>

                <div className="transactions-toolbar">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar transação..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                </div>

                <div className="transactions-table-card">
                    <div className="transactions-table-header">
                        <h3>Histórico de transações</h3>
                        <span>{transactions.length} lançamento(s)</span>
                    </div>
                    <div className="transactions-header-divider"></div>

                    {loading ? (
                        <div className="transactions-empty">
                            <p>Carregando transações...</p>
                        </div>
                    ) : error ? (
                        <div className="transactions-empty">
                            <p>Erro ao carregar: {error}</p>
                        </div>
                    ) : filteredTransactions.length > 0 ? (
                        <TransactionList
                            transactions={filteredTransactions}
                            onEdit={openEditForm}
                            onDelete={setTransactionToDelete}
                        />
                    ) : (
                        <div className="transactions-empty">
                            <p>
                                {search
                                    ? "Nenhuma transação encontrada."
                                    : "Nenhuma transação cadastrada."}
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {showForm && (
                <TransactionFormModal
                    transaction={editingTransaction}
                    categories={categories}
                    onCategoryCreated={(category) =>
                        setCategories((previous) => [...previous, category])
                    }
                    onSaved={handleTransactionSaved}
                    onClose={closeForm}
                />
            )}

            {transactionToDelete && (
                <ConfirmDialog
                    title="Excluir transação?"
                    description={`Tem certeza de que deseja excluir "${transactionToDelete.description}"? Essa ação não poderá ser desfeita.`}
                    confirmLabel="Excluir transação"
                    loadingLabel="Excluindo..."
                    loading={deletingTransaction}
                    error={deleteError}
                    onConfirm={handleDeleteTransaction}
                    onCancel={closeDeleteDialog}
                />
            )}
        </>
    );
}

export default Transactions;
