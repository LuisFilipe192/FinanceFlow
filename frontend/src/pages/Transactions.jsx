import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, Search } from "lucide-react";

import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import TransactionFormModal from "../components/transactions/TransactionFormModal";
import TransactionList from "../components/transactions/TransactionList";
import { useToast } from "../context/ToastContext";
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

const TYPE_FILTERS = [
    { value: "ALL", label: "Todas" },
    { value: "INCOME", label: "Receitas" },
    { value: "EXPENSE", label: "Despesas" },
];

function Transactions() {
    const showToast = useToast();

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
    const [typeFilter, setTypeFilter] = useState("ALL");

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

        showToast({
            type: "success",
            message: isEditing ? "Transação atualizada." : "Transação registrada.",
        });
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
            showToast({ type: "success", message: "Transação excluída." });
            await refreshFinancialSummary();
        } catch (error) {
            console.error(error);
            setDeleteError("Não foi possível excluir a transação. Tente novamente.");
        } finally {
            setDeletingTransaction(false);
        }
    }

    const filteredTransactions = transactions.filter((transaction) =>
        (typeFilter === "ALL" || transaction.type === typeFilter) &&
        transaction.description.toLowerCase().includes(search.toLowerCase())
    );

    const isFiltering = search !== "" || typeFilter !== "ALL";

    function clearFilters() {
        setSearch("");
        setTypeFilter("ALL");
    }

    function renderList() {
        if (loading) {
            return <SkeletonRows rows={5} />;
        }

        if (error) {
            return (
                <EmptyState
                    title="Não foi possível carregar suas transações"
                    description={error}
                />
            );
        }

        if (transactions.length === 0) {
            return (
                <EmptyState
                    icon={<ArrowLeftRight size={24} />}
                    title="Nenhuma transação ainda"
                    description="Registre sua primeira receita ou despesa para começar a acompanhar suas finanças."
                    action={
                        <button className="primary-button" onClick={openCreateForm}>
                            <Plus size={18} />
                            Adicionar primeira transação
                        </button>
                    }
                />
            );
        }

        if (filteredTransactions.length === 0) {
            return (
                <EmptyState
                    icon={<Search size={24} />}
                    title="Nada encontrado"
                    description={
                        search
                            ? `Nenhuma transação corresponde a "${search}".`
                            : "Nenhuma transação desse tipo."
                    }
                    action={
                        <button className="secondary-button" onClick={clearFilters}>
                            Limpar filtros
                        </button>
                    }
                />
            );
        }

        return (
            <TransactionList
                transactions={filteredTransactions}
                onEdit={openEditForm}
                onDelete={setTransactionToDelete}
            />
        );
    }

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

                        {loading ? (
                            <Skeleton width="55%" height={30} />
                        ) : (
                            <strong className="income">
                                {formatCurrency(summary.income)}
                            </strong>
                        )}

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

                        {loading ? (
                            <Skeleton width="55%" height={30} />
                        ) : (
                            <strong className="expense">
                                {formatCurrency(summary.expenses)}
                            </strong>
                        )}

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

                    <div className="segmented-control" role="group" aria-label="Filtrar por tipo">
                        {TYPE_FILTERS.map((filter) => (
                            <button
                                type="button"
                                key={filter.value}
                                className={typeFilter === filter.value ? "active" : ""}
                                aria-pressed={typeFilter === filter.value}
                                onClick={() => setTypeFilter(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="transactions-table-card">
                    <div className="transactions-table-header">
                        <h3>Histórico de transações</h3>
                        <span>
                            {isFiltering
                                ? `${filteredTransactions.length} de ${transactions.length} lançamento(s)`
                                : `${transactions.length} lançamento(s)`}
                        </span>
                    </div>
                    <div className="transactions-header-divider"></div>

                    {renderList()}
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
