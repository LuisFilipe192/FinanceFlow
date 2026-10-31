import { useState } from "react";
import { Plus } from "lucide-react";

import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import Modal from "../Modal";
import Select from "../Select";
import { formatCurrency, formatDateToISO, parseISODate } from "../../utils/format";
import {
    createTransaction,
    updateTransaction,
    createCategory,
} from "../../services/transactions";

const TRANSFER_CATEGORY_NAME = "Transferências";

// O valor é guardado como dígitos em centavos ("125000" = R$ 1.250,00), como
// nos apps de banco: cada número digitado entra pela direita. 10 dígitos é o
// limite do campo no banco (max_digits=10, decimal_places=2).
const MAX_AMOUNT_DIGITS = 10;

function centsToNumber(digits) {
    return digits ? Number(digits) / 100 : 0;
}

function findTransferCategory(categories) {
    return categories.find((category) => category.name === TRANSFER_CATEGORY_NAME);
}

// O modal só existe na tela enquanto está aberto. Por isso o estado inicial
// é calculado aqui: ao fechar, o componente é desmontado e tudo é descartado.
function getInitialForm(transaction, categories) {
    if (transaction) {
        return {
            description: transaction.description,
            amount: String(Math.round(Number(transaction.amount) * 100)),
            type: transaction.type,
            date: transaction.date,
            category: transaction.category ? String(transaction.category) : "",
        };
    }

    const transferCategory = findTransferCategory(categories);

    return {
        description: "",
        amount: "",
        type: "INCOME",
        date: formatDateToISO(new Date()),
        category: transferCategory ? String(transferCategory.id) : "",
    };
}

function TransactionFormModal({ transaction, categories, onCategoryCreated, onSaved, onClose }) {
    const isEditing = Boolean(transaction);

    const [formData, setFormData] = useState(
        () => getInitialForm(transaction, categories)
    );
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryError, setCategoryError] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

    function validateForm() {
        const errors = {};

        const description = formData.description.trim();

        if (!description) {
            errors.description = formData.type === "INCOME"
                ? "De onde veio esse dinheiro? Ex.: Salário, freela."
                : "Com o que foi esse gasto? Ex.: Mercado, almoço.";
        } else if (description.length > 200) {
            errors.description = "Tente resumir em até 200 caracteres.";
        }

        if (centsToNumber(formData.amount) <= 0) {
            errors.amount = "Qual foi o valor? Digite os números.";
        }

        if (!formData.date) {
            errors.date = "Quando foi? Escolha uma data.";
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function handleCreateCategory() {
        // Mesma regra do backend: letras (com acentos) separadas por um espaço.
        const name = newCategoryName.trim().replace(/\s+/g, " ");

        if (!name) {
            setCategoryError("Informe o nome da categoria.");
            return;
        }

        if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) {
            setCategoryError("Use apenas letras e espaços.");
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

            onCategoryCreated(newCategory);

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

    async function handleSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setFormError("");

        const description = formData.description.trim();
        const amount = centsToNumber(formData.amount);

        const transferCategory = findTransferCategory(categories);

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

            const payload = {
                ...formData,
                description,
                amount: amount.toFixed(2),
                category: categoryId,
            };

            const savedTransaction = isEditing
                ? await updateTransaction(transaction.id, payload)
                : await createTransaction(payload);

            await onSaved(savedTransaction, isEditing);

        } catch (error) {
            console.error(error);
            setFormError(
                "Não foi possível salvar a transação. Verifique os dados e tente novamente."
            );
        } finally {
            setSaving(false);
        }
    }

    // O botão descreve exatamente o que vai acontecer.
    function getSubmitLabel() {
        if (saving) return "Salvando...";
        if (isEditing) return "Salvar alterações";

        const typeLabel = formData.type === "INCOME" ? "receita" : "despesa";
        const amount = centsToNumber(formData.amount);

        return amount > 0
            ? `Adicionar ${typeLabel} de ${formatCurrency(amount)}`
            : `Adicionar ${typeLabel}`;
    }

    const categoryOptions = categories.map((category) => ({
        value: String(category.id),
        label: category.name,
    }));

    return (
        <Modal
            title={isEditing ? "Editar transação" : "Nova transação"}
            description={
                isEditing
                    ? "Atualize os dados desta transação."
                    : "Adicione uma receita ou despesa."
            }
            onClose={onClose}
        >
            {/* data-type muda a cor de destaque do formulário inteiro (CSS). */}
            <form onSubmit={handleSubmit} data-type={formData.type} className="transaction-form" noValidate>
                <div className="transaction-type-selector" role="group" aria-label="Tipo da transação">
                    <span className="type-indicator" aria-hidden="true" />

                    <button
                        type="button"
                        className={formData.type === "INCOME" ? "selected" : ""}
                        aria-pressed={formData.type === "INCOME"}
                        onClick={() => setFormData({ ...formData, type: "INCOME" })}
                    >
                        Receita
                    </button>

                    <button
                        type="button"
                        className={formData.type === "EXPENSE" ? "selected" : ""}
                        aria-pressed={formData.type === "EXPENSE"}
                        onClick={() => setFormData({ ...formData, type: "EXPENSE" })}
                    >
                        Despesa
                    </button>
                </div>

                <label htmlFor="transaction-description">Descrição</label>
                <input
                    id="transaction-description"
                    type="text"
                    placeholder={
                        formData.type === "INCOME"
                            ? "Ex.: Salário, freela..."
                            : "Ex.: Mercado, almoço..."
                    }
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

                <label htmlFor="transaction-amount">Valor</label>
                <input
                    id="transaction-amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={formData.amount ? formatCurrency(centsToNumber(formData.amount)) : ""}
                    className={`amount-input ${fieldErrors.amount ? "input-error" : ""}`}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                    onChange={(event) => {
                        // Fica só com os dígitos: letras e símbolos nem entram.
                        const digits = event.target.value
                            .replace(/\D/g, "")
                            .replace(/^0+/, "")
                            .slice(0, MAX_AMOUNT_DIGITS);

                        setFormData((previous) => ({ ...previous, amount: digits }));
                        setFieldErrors((previous) => ({ ...previous, amount: "" }));
                    }}
                />

                {fieldErrors.amount && (
                    <span id="amount-error" className="field-error">
                        {fieldErrors.amount}
                    </span>
                )}

                {!showCategoryInput ? (
                    <>
                        <label htmlFor="transaction-category">Categoria</label>

                        <Select
                            id="transaction-category"
                            value={formData.category}
                            options={categoryOptions}
                            placeholder="Sem categoria"
                            onChange={(category) =>
                                setFormData((previous) => ({ ...previous, category }))
                            }
                        />

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                                setShowCategoryInput(true);
                                setCategoryError("");
                            }}
                        >
                            <Plus size={16} />
                            Criar nova categoria
                        </button>
                    </>
                ) : (
                    <div className="category-create-form">
                        <label htmlFor="new-category-name">Nome da nova categoria</label>

                        <input
                            id="new-category-name"
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

                <label htmlFor="transaction-date">Data</label>
                <DatePicker
                    id="transaction-date"
                    selected={formData.date ? parseISODate(formData.date) : null}
                    onChange={(date) => {
                        setFormData({
                            ...formData,
                            date: date ? formatDateToISO(date) : "",
                        });

                        if (date) {
                            setFieldErrors({ ...fieldErrors, date: "" });
                        }
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
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >
                        {getSubmitLabel()}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default TransactionFormModal;
