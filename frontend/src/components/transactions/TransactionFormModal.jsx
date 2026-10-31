import { useState } from "react";
import { Plus } from "lucide-react";

import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import Modal from "../Modal";
import Select from "../Select";
import { formatDateToISO, parseISODate } from "../../utils/format";
import {
    createTransaction,
    updateTransaction,
    createCategory,
} from "../../services/transactions";

const TRANSFER_CATEGORY_NAME = "Transferências";

function findTransferCategory(categories) {
    return categories.find((category) => category.name === TRANSFER_CATEGORY_NAME);
}

// O modal só existe na tela enquanto está aberto. Por isso o estado inicial
// é calculado aqui: ao fechar, o componente é desmontado e tudo é descartado.
function getInitialForm(transaction, categories) {
    if (transaction) {
        return {
            description: transaction.description,
            amount: String(transaction.amount).replace(".", ","),
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
        const amount = Number(formData.amount.replace(",", "."));

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

                        <Select
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
                        {saving
                            ? "Salvando..."
                            : isEditing
                                ? "Salvar alterações"
                                : "Salvar transação"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default TransactionFormModal;
