import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, Search } from "lucide-react";

import EmptyState from "../components/EmptyState";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import TransactionFormModal from "../components/transactions/TransactionFormModal";
import TransactionList from "../components/transactions/TransactionList";
import { useToast } from "../context/ToastContext";
import { formatCurrency } from "../utils/format";
import { BEFORE_LOGOUT_EVENT } from "../services/api";
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

// Tempo para desfazer uma exclusão antes de ela ir para o servidor.
const UNDO_DELAY = 5000;

function isInCurrentPeriod(transaction) {
    const { month, year } = getCurrentPeriod();
    const [transactionYear, transactionMonth] = transaction.date.split("-").map(Number);

    return transactionYear === year && transactionMonth === month;
}

// Soma (sign = 1) ou subtrai (sign = -1) uma transação do resumo do mês, para
// os cards reagirem na hora, sem esperar o servidor.
function applyToSummary(summary, transaction, sign) {
    if (!isInCurrentPeriod(transaction)) return summary;

    const amount = Number(transaction.amount) * sign;
    const income = Number(summary.income) + (transaction.type === "INCOME" ? amount : 0);
    const expenses = Number(summary.expenses) + (transaction.type === "EXPENSE" ? amount : 0);

    return { income, expenses, balance: income - expenses };
}

function isTypingInField(target) {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

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

    // Id da transação recém-salva: a linha dela pisca uma vez para você achá-la.
    const [highlightId, setHighlightId] = useState(null);

    // Exclusões aguardando os 5 segundos do "Desfazer": id -> { transaction, timer }.
    const pendingDeletes = useRef(new Map());

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

    // Atalho: N abre uma nova transação (fora de campos de texto e de modais).
    useEffect(() => {
        function handleKeyDown(event) {
            if (
                event.key.toLowerCase() !== "n" ||
                event.ctrlKey || event.metaKey || event.altKey ||
                showForm ||
                isTypingInField(event.target)
            ) {
                return;
            }

            event.preventDefault();
            setEditingTransaction(null);
            setShowForm(true);
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showForm]);

    // Exclusões pendentes não podem se perder: se a aba fechar ou você trocar
    // de página antes dos 5 segundos, elas vão para o servidor na hora.
    useEffect(() => {
        const pending = pendingDeletes.current;

        // Envia na hora todas as exclusões pendentes e devolve as promessas.
        function flushPendingDeletes() {
            const requests = [...pending.values()].map(({ transaction, timer }) => {
                clearTimeout(timer);
                return deleteTransaction(transaction.id, { keepalive: true })
                    .catch(console.error);
            });

            pending.clear();

            return requests;
        }

        // Logout: o AuthProvider espera estas exclusões antes de encerrar a sessão.
        function handleBeforeLogout(event) {
            for (const request of flushPendingDeletes()) {
                event.detail.waitFor(request);
            }
        }

        window.addEventListener("beforeunload", flushPendingDeletes);
        window.addEventListener(BEFORE_LOGOUT_EVENT, handleBeforeLogout);

        return () => {
            window.removeEventListener("beforeunload", flushPendingDeletes);
            window.removeEventListener(BEFORE_LOGOUT_EVENT, handleBeforeLogout);

            // Troca de página: o aviso com "Desfazer" deixaria de funcionar,
            // então ele é substituído por uma confirmação simples.
            if (flushPendingDeletes().length > 0) {
                showToast({ type: "success", message: "Transação excluída." });
            }
        };
    }, [showToast]);

    async function refreshFinancialSummary() {
        try {
            const dashboardData = await getDashboard(getCurrentPeriod());
            setSummary(dashboardData.summary);
            return dashboardData.summary;
        } catch (error) {
            console.error("Erro ao atualizar indicadores:", error);
            return null;
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

    function highlight(id) {
        setHighlightId(id);
        setTimeout(() => setHighlightId(null), 1600);
    }

    async function handleTransactionSaved(savedTransaction, isEditing) {
        const isFirstTransaction = !isEditing && transactions.length === 0;

        setTransactions((previous) =>
            isEditing
                ? previous.map((transaction) =>
                    transaction.id === savedTransaction.id
                        ? savedTransaction
                        : transaction
                )
                : [savedTransaction, ...previous]
        );

        const updatedSummary = await refreshFinancialSummary();
        closeForm();
        highlight(savedTransaction.id);

        const typeLabel = savedTransaction.type === "INCOME" ? "Receita" : "Despesa";
        const balanceText = updatedSummary
            ? ` Saldo do mês: ${formatCurrency(updatedSummary.balance)}.`
            : "";

        showToast({
            type: "success",
            message: isFirstTransaction
                ? "Primeira transação registrada! Agora é só acompanhar."
                : isEditing
                    ? `Transação atualizada.${balanceText}`
                    : `${typeLabel} de ${formatCurrency(savedTransaction.amount)} registrada.${balanceText}`,
        });
    }

    function restoreTransaction(transaction) {
        setTransactions((previous) =>
            previous.some((item) => item.id === transaction.id)
                ? previous
                : [...previous, transaction]
        );
        setSummary((previous) => applyToSummary(previous, transaction, 1));
    }

    async function commitDelete(transaction) {
        pendingDeletes.current.delete(transaction.id);

        try {
            await deleteTransaction(transaction.id);
            await refreshFinancialSummary();
        } catch (error) {
            console.error(error);
            restoreTransaction(transaction);
            showToast({
                type: "error",
                message: `Não foi possível excluir "${transaction.description}". Ela voltou para a lista.`,
            });
        }
    }

    function undoDelete(id) {
        const pending = pendingDeletes.current.get(id);
        if (!pending) return;

        clearTimeout(pending.timer);
        pendingDeletes.current.delete(id);
        restoreTransaction(pending.transaction);
        highlight(id);

        showToast({ type: "success", message: "Pronto, a transação voltou." });
    }

    // A transação some da tela na hora; o servidor só é chamado depois de
    // UNDO_DELAY. Até lá, "Desfazer" só precisa devolvê-la para a lista.
    function handleDeleteTransaction(transaction) {
        setTransactions((previous) =>
            previous.filter((item) => item.id !== transaction.id)
        );
        setSummary((previous) => applyToSummary(previous, transaction, -1));

        const timer = setTimeout(() => commitDelete(transaction), UNDO_DELAY);
        pendingDeletes.current.set(transaction.id, { transaction, timer });

        showToast({
            type: "info",
            message: `"${transaction.description}" excluída.`,
            duration: UNDO_DELAY,
            action: {
                label: "Desfazer",
                onClick: () => undoDelete(transaction.id),
            },
        });
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
                    title="Tudo calmo por aqui"
                    description="Que tal registrar seu primeiro gasto ou receita? Em segundos você já vê para onde vai o seu dinheiro."
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
                onDelete={handleDeleteTransaction}
                highlightId={highlightId}
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

                    <button
                        className="primary-button"
                        onClick={openCreateForm}
                        title="Atalho: tecla N"
                    >
                        <Plus size={18} />
                        Nova transação
                        <kbd className="kbd-hint">N</kbd>
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
        </>
    );
}

export default Transactions;
