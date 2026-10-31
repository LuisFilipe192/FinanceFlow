import { useEffect, useState, useRef } from "react";
import {ArrowDownLeft,ArrowUpRight,Plus,Search,ChevronDown,Pencil,Trash2} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { getDashboard } from "../services/dashboard";

import {
    getTransactions,
    getCategories,
    createTransaction,
    createCategory,
    updateTransaction,
    deleteTransaction,
} from "../services/transactions";

import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

// Usa o fuso local do navegador. toISOString() converte para UTC e,
// no Brasil, depois das 21h já retornaria a data do dia seguinte.
function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getEmptyForm() {
    return {
        description: "",
        amount: "",
        type: "INCOME",
        date: formatDateToISO(new Date()),
        category: "",
    };
}

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [categoryError, setCategoryError] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [deletingTransaction, setDeletingTransaction] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryDropdownRef = useRef(null);

    const [formData, setFormData] = useState(getEmptyForm);

    const [summary, setSummary] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
    });

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    function validateForm() {
        const errors = {};

        const description = formData.description.trim();
        const amountText = formData.amount.trim().replace(",", ".");
        const amount = Number(amountText);

        if (!description) {
            errors.description = "Informe a descrição da transação.";
        } else if (description.length > 200) {
            errors.description = "Use no máximo 200 caracteres.";
        }

        if (!amountText) {
            errors.amount = "Informe o valor da transação.";
        } else if (!Number.isFinite(amount)) {
            errors.amount = "Digite um valor numérico válido.";
        } else if (amount <= 0) {
            errors.amount = "O valor deve ser maior que zero.";
        }

        if (!formData.date) {
            errors.date = "Informe a data da transação.";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function handleCreateCategory() {
        const name = newCategoryName.trim();
        if (!/^[\p{L}\s]+$/u.test(name)) {
            setCategoryError("Use apenas letras e espaços.");
            return;
        }

        if (!name) {
            setCategoryError("Informe o nome da categoria.");
            return;
        }

        if (name.length > 100) {
            setCategoryError("Use no máximo 100 caracteres.");
            return;
        }

        try {
            setSavingCategory(true);
            setCategoryError("");

            const newCategory = await createCategory(name);

            setCategories((previous) => [
                ...previous,
                newCategory,
            ]);

            setFormData((previous) => ({
                ...previous,
                category: String(newCategory.id),
            }));

            setNewCategoryName("");
            setShowCategoryInput(false);

        } catch (error) {
            console.error(error);
            setCategoryError("Não foi possível cadastrar a categoria.");
        } finally {
            setSavingCategory(false);
        }
    }

    async function refreshFinancialSummary() {
        try {
            const currentDate = new Date();

            const dashboardData = await getDashboard({
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear(),
            });

            setSummary(dashboardData.summary);
        } catch (error) {
            console.error("Erro ao atualizar indicadores:", error);
        }
    }

    function resetModalState() {
        setFieldErrors({});
        setFormError("");
        setShowCategoryInput(false);
        setShowCategoryDropdown(false);
        setNewCategoryName("");
        setCategoryError("");
    }

    function openCreateModal() {
        const transferCategory = categories.find(
            (category) => category.name === "Transferências"
        );

        setEditingTransaction(null);
        setFormData({
            ...getEmptyForm(),
            category: transferCategory ? String(transferCategory.id) : "",
        });
        resetModalState();
        setShowModal(true);
    }

    function closeTransactionModal() {
        setShowModal(false);
        setEditingTransaction(null);
        setFormData(getEmptyForm());
        resetModalState();
    }

    function closeDeleteModal() {
        setTransactionToDelete(null);
        setDeleteError("");
    }

    function handleEditTransaction(transaction) {
        setEditingTransaction(transaction);

        setFormData({
            description: transaction.description,
            amount: String(transaction.amount).replace(".", ","),
            type: transaction.type,
            date: transaction.date,
            category: transaction.category
                ? String(transaction.category)
                : "",
        });

        resetModalState();
        setShowModal(true);
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

            closeDeleteModal();
            await refreshFinancialSummary();
        } catch (error) {
            console.error(error);
            setDeleteError("Não foi possível excluir a transação. Tente novamente.");
        } finally {
            setDeletingTransaction(false);
        }
    }


    async function handleSubmit(event) {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setFormError("");

        const description = formData.description.trim();
        const amount = Number(formData.amount.replace(",", "."));

        const transferCategory = categories.find(
            (category) => category.name === "Transferências"
        );

        const categoryId = formData.category || (
            transferCategory ? String(transferCategory.id) : ""
        );

        if (!categoryId) {
            setFormError(
                "A categoria Transferências não está disponível. Atualize a página e tente novamente."
            );
            return;
        }

        try {
            setSaving(true);

            const newTransaction = {
                ...formData,
                description,
                amount: amount.toFixed(2),
                category: categoryId,
            };

            const savedTransaction = editingTransaction
                ? await updateTransaction(editingTransaction.id, newTransaction)
                : await createTransaction(newTransaction);

            setTransactions((previous) =>
                editingTransaction
                    ? previous.map((transaction) =>
                        transaction.id === savedTransaction.id
                            ? savedTransaction
                            : transaction
                    )
                    : [savedTransaction, ...previous]
            );
            await refreshFinancialSummary();

            closeTransactionModal();

        } catch (error) {
            console.error(error);
            setFormError(
                "Não foi possível salvar a transação. Verifique os dados e tente novamente."
            );
        } finally {
            setSaving(false);
        }
    }


    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                const today = new Date();

                const [transactionData, categoryData, dashboardData] = await Promise.all([
                    getTransactions(),
                    getCategories(),
                    getDashboard({
                        month: today.getMonth() + 1,
                        year: today.getFullYear(),
                    }),
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

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                categoryDropdownRef.current &&
                !categoryDropdownRef.current.contains(event.target)
            ) {
                setShowCategoryDropdown(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatCurrency = (value) =>
        Number(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });

    const formatDate = (date) =>
        new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");

    const filteredTransactions = transactions.filter((transaction) =>
        transaction.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="main-content">
                <Header />

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
                            onClick={openCreateModal}
                        >
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
                            <div className="transactions-list">
                                {filteredTransactions.map((transaction) => {
                                    const isIncome = transaction.type === "INCOME";

                                    return (                                          
                                        <div className="transaction-row" key={transaction.id}>
                                            <div className={`transaction-icon ${isIncome ? "income" : "expense"}`}>
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
                                                <strong className={`transaction-amount ${isIncome ? "income" : "expense"}`}>
                                                    {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
                                                </strong>

                                                <span className={`transaction-type ${isIncome ? "income" : "expense"}`}>
                                                    {isIncome ? "Receita" : "Despesa"}
                                                </span>

                                                <div className="transaction-actions">
                                                    <button
                                                        type="button"
                                                        className="transaction-edit-button"
                                                        onClick={() => handleEditTransaction(transaction)}
                                                    >
                                                        <Pencil size={14} />
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="transaction-delete-button"
                                                        onClick={() => setTransactionToDelete(transaction)}
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
                    {showModal && (
                        <div className="modal-overlay">
                            <div className="transaction-modal">
                                <div className="modal-header">
                                    <div>
                                        <h2>{editingTransaction ? "Editar transação" : "Nova transação"}</h2>
                                        <p>
                                            {editingTransaction
                                                ? "Atualize os dados desta transação."
                                                : "Adicione uma receita ou despesa."}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={closeTransactionModal}
                                    >
                                        ×
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="transaction-type-selector">
                                        <button
                                            type="button"
                                            className={formData.type === "INCOME" ? "selected income" : ""}
                                            onClick={() => setFormData({ ...formData, type: "INCOME" })}
                                        >
                                            Receita
                                        </button>

                                        <button
                                            type="button"
                                            className={formData.type === "EXPENSE" ? "selected expense" : ""}
                                            onClick={() => setFormData({ ...formData, type: "EXPENSE" })}
                                        >
                                            Despesa
                                        </button>
                                    </div>

                                    <label>Descrição</label>                                                                        
                                    <input
                                        type="text"
                                        placeholder="Ex.: Salário, almoço..."
                                        maxLength={200}
                                        value={formData.description}
                                        className={fieldErrors.description ? "input-error" : ""}
                                        aria-invalid={Boolean(fieldErrors.description)}
                                        aria-describedby={fieldErrors.description ? "description-error" : undefined}
                                        onChange={(event) => {
                                            setFormData({ ...formData, description: event.target.value });
                                            setFieldErrors({ ...fieldErrors, description: "" });
                                        }}
                                        required
                                    />

                                    {fieldErrors.description && (
                                        <span id="description-error" className="field-error">
                                            {fieldErrors.description}
                                        </span>
                                    )}
                                    <label>Valor (R$)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Digite apenas números (ex.: 250,00)"
                                            value={formData.amount}
                                            className={fieldErrors.amount ? "input-error" : ""}
                                            aria-invalid={Boolean(fieldErrors.amount)}
                                            aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                                            onChange={(event) => {
                                                const value = event.target.value;

                                                if (!/^\d*[.,]?\d*$/.test(value)) {
                                                    setFieldErrors((previous) => ({
                                                        ...previous,
                                                        amount: "Não são permitidas letras ou caracteres. Digite apenas números.",
                                                    }));

                                                    setTimeout(() => {
                                                        setFieldErrors((previous) => ({
                                                            ...previous,
                                                            amount: "",
                                                        }));
                                                    }, 3000);

                                                    return;
                                                }

                                                setFormData((previous) => ({
                                                    ...previous,
                                                    amount: value,
                                                }));

                                                setFieldErrors((previous) => ({
                                                    ...previous,
                                                    amount: "",
                                                }));
                                            }}
                                            required
                                        />
                                        {fieldErrors.amount && (
                                            <span id="amount-error" className="field-error">
                                                {fieldErrors.amount}
                                            </span>
                                        )}

                                    {!showCategoryInput ? (
                                        <>
                                            <label>Categoria</label>

                                            <div className="category-dropdown" ref={categoryDropdownRef}>
                                                <button
                                                    type="button"
                                                    className={`category-dropdown-trigger ${showCategoryDropdown ? "open" : ""}`}
                                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                                >
                                                    <span>
                                                        {categories.find(
                                                            (category) =>
                                                                String(category.id) === String(formData.category)
                                                        )?.name || "Sem categoria"}
                                                    </span>

                                                    <ChevronDown size={18} />
                                                </button>

                                                {showCategoryDropdown && (
                                                    <div className="category-dropdown-menu">
                                                        {categories.map((category) => (
                                                            <button
                                                                type="button"
                                                                key={category.id}
                                                                className={`category-dropdown-option ${
                                                                    String(formData.category) === String(category.id)
                                                                        ? "selected"
                                                                        : ""
                                                                }`}
                                                                onClick={() => {
                                                                    setFormData({
                                                                        ...formData,
                                                                        category: String(category.id)
                                                                    });
                                                                    setShowCategoryDropdown(false);
                                                                }}
                                                            >
                                                                {category.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() => {
                                                    setShowCategoryInput(true);
                                                    setShowCategoryDropdown(false);
                                                    setCategoryError("");
                                                }}
                                            >
                                                <Plus size={16} />
                                                Criar nova categoria
                                            </button>
                                        </>
                                    ) : (
                                        <div className="category-create-form">
                                            <label>Nome da nova categoria</label>

                                            <input
                                                type="text"
                                                placeholder="Digite o nome da categoria"
                                                maxLength={100}
                                                value={newCategoryName}
                                                onChange={(event) => {
                                                    const value = event.target.value;

                                                    if (/[0-9]/.test(value)) {
                                                        setCategoryError(
                                                            "Não são permitidos números. Digite apenas letras."
                                                        );

                                                        setTimeout(() => {
                                                            setCategoryError("");
                                                        }, 3000);

                                                        return;
                                                    }

                                                    setNewCategoryName(value);
                                                    setCategoryError("");
                                                }}
                                            />

                                            <button
                                                type="button"
                                                className="primary-button"
                                                onClick={handleCreateCategory}
                                                disabled={savingCategory}
                                            >
                                                {savingCategory ? "Salvando..." : "Salvar categoria"}
                                            </button>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() => {
                                                    setShowCategoryInput(false);
                                                    setNewCategoryName("");
                                                    setCategoryError("");
                                                }}
                                            >
                                                Cancelar
                                            </button>

                                            {categoryError && (
                                                <span className="field-error">
                                                    {categoryError}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <label>Data</label>
                                        <DatePicker
                                            selected={
                                                formData.date
                                                    ? new Date(`${formData.date}T00:00:00`)
                                                    : null
                                            }
                                            onChange={(date) => {
                                                if (!date) {
                                                    setFormData({
                                                        ...formData,
                                                        date: ""
                                                    });
                                                    return;
                                                }

                                                setFormData({
                                                    ...formData,
                                                    date: formatDateToISO(date)
                                                });

                                                setFieldErrors({
                                                    ...fieldErrors,
                                                    date: ""
                                                });
                                            }}
                                            locale={ptBR}
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText="Selecione uma data"
                                            className={fieldErrors.date ? "input-error" : ""}
                                            ariaInvalid={Boolean(fieldErrors.date)}
                                            ariaDescribedBy={fieldErrors.date ? "date-error" : undefined}
                                            showPopperArrow={false}
                                        />
                                        {fieldErrors.date && (
                                            <span id="date-error" className="field-error">
                                                {fieldErrors.date}
                                            </span>
                                        )}

                                    {formError && (
                                        <p className="form-error">{formError}</p>
                                    )}

                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={closeTransactionModal}
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            className="primary-button"
                                            disabled={saving}
                                        >
                                            {saving
                                                ? "Salvando..."
                                                : editingTransaction
                                                    ? "Salvar alterações"
                                                    : "Salvar transação"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    {transactionToDelete && (
                        <div className="modal-overlay">
                            <div className="transaction-modal">
                                <div className="modal-header">
                                    <div>
                                        <h2>Excluir transação?</h2>
                                        <p>
                                            Tem certeza de que deseja excluir
                                            "{transactionToDelete.description}"?
                                            Essa ação não poderá ser desfeita.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="modal-close"
                                        onClick={closeDeleteModal}
                                        disabled={deletingTransaction}
                                    >
                                        ×
                                    </button>
                                </div>

                                {deleteError && (
                                    <p className="form-error">{deleteError}</p>
                                )}

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={closeDeleteModal}
                                        disabled={deletingTransaction}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        className="danger-button"
                                        onClick={handleDeleteTransaction}
                                        disabled={deletingTransaction}
                                    >
                                        {deletingTransaction ? "Excluindo..." : "Excluir transação"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
            </main>
        </div>
    );
}

export default Transactions;
