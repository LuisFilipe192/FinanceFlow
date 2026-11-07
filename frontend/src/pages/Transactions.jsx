import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, Search } from "lucide-react";

import EmptyState from "../components/EmptyState";
import FixedBillsCard from "../components/fixedBills/FixedBillsCard";
import InstallmentDeleteDialog from "../components/transactions/InstallmentDeleteDialog";
import PageActions from "../components/PageActions";
import PeriodPicker from "../components/PeriodPicker";
import { Skeleton, SkeletonRows } from "../components/Skeleton";
import TransactionFormModal from "../components/transactions/TransactionFormModal";
import TransactionList from "../components/transactions/TransactionList";
import { useToast } from "../context/ToastContext";
import { formatCurrency, pluralize } from "../utils/format";
import { hasFollowingInstallments } from "../utils/installments";
import { MONTH_NAMES } from "../utils/insights";
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

function getTransactionPeriod(transaction) {
    const [year, month] = transaction.date.split("-").map(Number);

    return { month, year };
}

function isInPeriod(transaction, period) {
    const { month, year } = getTransactionPeriod(transaction);

    return year === period.year && month === period.month;
}

function formatPeriod({ month, year }) {
    return `${MONTH_NAMES[month - 1]} de ${year}`;
}

// Soma (sign = 1) ou subtrai (sign = -1) uma transação do resumo do mês, para
// os cards reagirem na hora, sem esperar o servidor.
function applyToSummary(summary, transaction, sign, period) {
    if (!isInPeriod(transaction, period)) return summary;

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

    const [period, setPeriod] = useState(getCurrentPeriod);
    const periodRef = useRef(period);

    useEffect(() => {
        periodRef.current = period;
    }, [period]);

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
    const [installmentToDelete, setInstallmentToDelete] = useState(null);
    const [deletingInstallments, setDeletingInstallments] = useState(false);
    const [installmentDeleteError, setInstallmentDeleteError] = useState("");

    // Id da transação recém-salva: a linha dela pisca uma vez para você achá-la.
    const [highlightId, setHighlightId] = useState(null);

    // Exclusões aguardando os 5 segundos do "Desfazer": id -> { transaction, timer }.
    const pendingDeletes = useRef(new Map());
    const pendingHighlight = useRef(null);
    const [billsRefreshKey, setBillsRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        getCategories({ signal: controller.signal })
            .then(setCategories)
            .catch((requestError) => {
                if (requestError.name !== "AbortError") console.error(requestError);
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        async function loadData() {
            try {
                setLoading(true);
                setError(null);

                const [transactionData, dashboardData] = await Promise.all([
                    getTransactions({ ...period, signal }),
                    getDashboard({ ...period, signal }),
                ]);

                setTransactions(transactionData);
                setSummary(dashboardData.summary);

                const highlightedId = pendingHighlight.current;
                if (highlightedId) {
                    pendingHighlight.current = null;
                    setHighlightId(highlightedId);
                    setTimeout(() => setHighlightId(null), 1600);
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error(error);
                    setError(error.message);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadData();

        return () => controller.abort();
    }, [period]);

    // Atalho: N abre uma nova transação (fora de campos de texto e de modais).
    useEffect(() => {
        function handleKeyDown(event) {
            if (
                event.key.toLowerCase() !== "n" ||
                event.ctrlKey || event.metaKey || event.altKey ||
                showForm ||
                document.querySelector('[role="dialog"]') ||
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
            const dashboardData = await getDashboard(periodRef.current);
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
        const inPeriod = isInPeriod(savedTransaction, period);

        setTransactions((previous) => {
            const others = previous.filter((transaction) => transaction.id !== savedTransaction.id);

            if (!inPeriod) return others;

            return isEditing
                ? previous.map((transaction) =>
                    transaction.id === savedTransaction.id
                        ? savedTransaction
                        : transaction
                )
                : [savedTransaction, ...previous];
        });

        const updatedSummary = await refreshFinancialSummary();
        closeForm();
        setBillsRefreshKey((current) => current + 1);

        const isNewPurchase = !isEditing && Boolean(savedTransaction.installment_total);
        const typeLabel = savedTransaction.type === "INCOME" ? "Receita" : "Despesa";
        const amountText = formatCurrency(savedTransaction.amount);
        const savedText = isEditing
            ? "Transação atualizada."
            : isNewPurchase
                ? `${savedTransaction.installment_total} parcelas de ${amountText} registradas.`
                : `${typeLabel} de ${amountText} registrada.`;

        if (!inPeriod) {
            const savedPeriod = getTransactionPeriod(savedTransaction);

            showToast({
                type: "success",
                message: `${savedText} ${isNewPurchase ? "A primeira" : "Ela"} está em ${formatPeriod(savedPeriod)}.`,
                action: {
                    label: "Ver",
                    onClick: () => {
                        pendingHighlight.current = savedTransaction.id;
                        setPeriod(savedPeriod);
                    },
                },
            });
            return;
        }

        highlight(savedTransaction.id);

        const balanceText = updatedSummary
            ? ` Saldo de ${MONTH_NAMES[period.month - 1]}: ${formatCurrency(updatedSummary.balance)}.`
            : "";

        showToast({ type: "success", message: `${savedText}${balanceText}` });
    }

    function handleCategoryCreated(category) {
        setCategories((previous) => [...previous, category]);
    }

    function restoreTransaction(transaction) {
        const currentPeriod = periodRef.current;

        if (!isInPeriod(transaction, currentPeriod)) return;

        setTransactions((previous) =>
            previous.some((item) => item.id === transaction.id)
                ? previous
                : [...previous, transaction]
        );
        setSummary((previous) => applyToSummary(previous, transaction, 1, currentPeriod));
    }

    async function commitDelete(transaction) {
        pendingDeletes.current.delete(transaction.id);

        try {
            await deleteTransaction(transaction.id);
            await refreshFinancialSummary();
            setBillsRefreshKey((current) => current + 1);
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
        setSummary((previous) => applyToSummary(previous, transaction, -1, period));

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

    function requestDelete(transaction) {
        if (hasFollowingInstallments(transaction)) {
            setInstallmentDeleteError("");
            setInstallmentToDelete(transaction);
            return;
        }

        handleDeleteTransaction(transaction);
    }

    function deleteOnlyThisInstallment() {
        handleDeleteTransaction(installmentToDelete);
        setInstallmentToDelete(null);
    }

    async function deleteFollowingInstallments() {
        const transaction = installmentToDelete;

        try {
            setDeletingInstallments(true);
            setInstallmentDeleteError("");

            await deleteTransaction(transaction.id, { scope: "following" });

            setTransactions((previous) => previous.filter((item) => item.id !== transaction.id));
            await refreshFinancialSummary();
            setInstallmentToDelete(null);
            showToast({ type: "success", message: `Parcelas de "${transaction.description}" excluídas.` });
        } catch (error) {
            console.error(error);
            setInstallmentDeleteError(error.message);
        } finally {
            setDeletingInstallments(false);
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
                    title={`Nada registrado em ${formatPeriod(period)}`}
                    description="Registre um gasto ou uma receita e veja para onde vai o seu dinheiro."
                    action={
                        <button className="primary-button" onClick={openCreateForm}>
                            <Plus size={18} />
                            Adicionar transação
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
                onDelete={requestDelete}
                highlightId={highlightId}
            />
        );
    }

    return (
        <>
            <PageActions>
                <PeriodPicker
                    month={period.month}
                    year={period.year}
                    onChange={setPeriod}
                />

                <button
                    className="primary-button"
                    onClick={openCreateForm}
                    title="Atalho: tecla N"
                >
                    <Plus size={18} />
                    Nova transação
                    <kbd className="kbd-hint">N</kbd>
                </button>
            </PageActions>

            <section className="dashboard-section">
                <div className="transaction-summary">
                    <div className="transaction-summary-card">
                        <div className="summary-card-top">
                            <span>Receitas de {MONTH_NAMES[period.month - 1]}</span>
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
                            Total recebido no mês
                        </span>
                    </div>

                    <div className="transaction-summary-card">
                        <div className="summary-card-top">
                            <span>Despesas de {MONTH_NAMES[period.month - 1]}</span>
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
                            Total gasto no mês
                        </span>
                    </div>
                </div>

                <FixedBillsCard
                    period={period}
                    categories={categories}
                    refreshKey={billsRefreshKey}
                    onCategoryCreated={handleCategoryCreated}
                    onPaid={(payment) => handleTransactionSaved(payment, false)}
                />

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
                                ? `${filteredTransactions.length} de ${pluralize(transactions.length, "lançamento", "lançamentos")}`
                                : pluralize(transactions.length, "lançamento", "lançamentos")}
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
                    onCategoryCreated={handleCategoryCreated}
                    onSaved={handleTransactionSaved}
                    onClose={closeForm}
                />
            )}

            {installmentToDelete && (
                <InstallmentDeleteDialog
                    transaction={installmentToDelete}
                    loading={deletingInstallments}
                    error={installmentDeleteError}
                    onDeleteOne={deleteOnlyThisInstallment}
                    onDeleteFollowing={deleteFollowingInstallments}
                    onCancel={() => setInstallmentToDelete(null)}
                />
            )}
        </>
    );
}

export default Transactions;
