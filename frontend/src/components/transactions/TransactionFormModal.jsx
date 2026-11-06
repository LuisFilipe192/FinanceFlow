import { useState } from "react";

import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import CategoryPicker from "../categories/CategoryPicker";
import CurrencyInput from "../CurrencyInput";
import Modal from "../Modal";
import { centsToNumber, formatCurrency, formatDateToISO, numberToCents, parseISODate } from "../../utils/format";
import {
    createTransaction,
    updateTransaction,
} from "../../services/transactions";
import { DEFAULT_CATEGORY_NAME } from "../../utils/categories";

function findTransferCategory(categories) {
    return categories.find((category) => category.name === DEFAULT_CATEGORY_NAME);
}

// O modal só existe na tela enquanto está aberto. Por isso o estado inicial
// é calculado aqui: ao fechar, o componente é desmontado e tudo é descartado.
function getInitialForm(transaction, categories) {
    if (transaction) {
        return {
            description: transaction.description,
            amount: numberToCents(transaction.amount),
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
                <CurrencyInput
                    id="transaction-amount"
                    value={formData.amount}
                    className={`amount-input ${fieldErrors.amount ? "input-error" : ""}`}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                    onChange={(digits) => {
                        setFormData((previous) => ({ ...previous, amount: digits }));
                        setFieldErrors((previous) => ({ ...previous, amount: "" }));
                    }}
                />

                {fieldErrors.amount && (
                    <span id="amount-error" className="field-error">
                        {fieldErrors.amount}
                    </span>
                )}

                <label htmlFor="transaction-category">Categoria</label>
                <CategoryPicker
                    id="transaction-category"
                    value={formData.category}
                    categories={categories}
                    placeholder="Sem categoria"
                    onChange={(category) =>
                        setFormData((previous) => ({ ...previous, category }))
                    }
                    onCategoryCreated={onCategoryCreated}
                />

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
