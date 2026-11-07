import { useEffect, useRef, useState } from "react";

import CurrencyInput from "../CurrencyInput";
import Modal from "../Modal";
import { createCategory, updateCategory } from "../../services/transactions";
import { centsToNumber, numberToCents } from "../../utils/format";

function centsToBudget(digits) {
    return digits ? centsToNumber(digits).toFixed(2) : null;
}

const MAX_LENGTH = 100;

// Mesma regra do backend: letras (com acentos) separadas por um espaço.
function normalizeName(value) {
    return value.trim().replace(/\s+/g, " ");
}

function getNameError(name, categories, currentId) {
    if (!name) {
        return "Informe o nome da categoria.";
    }

    if (/\d/.test(name)) {
        return "Números não são permitidos. Use apenas letras.";
    }

    if (!/^\p{L}+(?: \p{L}+)*$/u.test(name)) {
        return "Use apenas letras e espaços, sem símbolos.";
    }

    const duplicate = categories.find(
        (category) =>
            category.id !== currentId &&
            category.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR")
    );

    if (duplicate) {
        return `Você já tem a categoria "${duplicate.name}".`;
    }

    return "";
}

// category = null cria uma categoria nova; um objeto edita a existente.
function CategoryFormModal({ category, categories, onSaved, onClose }) {
    const isEditing = Boolean(category);
    const initialBudget = numberToCents(category?.monthly_budget);

    const [value, setValue] = useState(category ? category.name : "");
    const [budget, setBudget] = useState(initialBudget);
    const [budgetError, setBudgetError] = useState("");
    // Só mostra erro depois que a pessoa começou a digitar ou tentou salvar:
    // ninguém gosta de abrir um formulário e já ver uma mensagem vermelha.
    const [touched, setTouched] = useState(false);
    const [serverError, setServerError] = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        // Na edição, o texto já vem selecionado: digitar substitui o nome todo.
        inputRef.current?.focus();
        if (isEditing) inputRef.current?.select();
    }, [isEditing]);

    const name = normalizeName(value);
    const validationError = getNameError(name, categories, category?.id);
    const nameChanged = !isEditing || name !== category.name;
    const budgetChanged = budget !== initialBudget;
    const unchanged = isEditing && !nameChanged && !budgetChanged;
    const visibleError = serverError || (touched ? validationError : "");

    async function handleSubmit(event) {
        event.preventDefault();
        setTouched(true);

        if (validationError || unchanged) return;

        try {
            setSaving(true);
            setServerError("");
            setBudgetError("");

            let savedCategory;

            if (isEditing) {
                const changes = {};
                if (nameChanged) changes.name = name;
                if (budgetChanged) changes.monthly_budget = centsToBudget(budget);

                savedCategory = await updateCategory(category.id, changes);
            } else {
                savedCategory = await createCategory(name, centsToBudget(budget));
            }

            onSaved(savedCategory, category);
        } catch (error) {
            console.error(error);
            // O backend responde { name: "mensagem" } quando a validação falha.
            if (error.data?.monthly_budget) {
                setBudgetError(error.data.monthly_budget);
            }

            if (error.data?.name || !error.data?.monthly_budget) {
                setServerError(
                    error.data?.name ||
                    (isEditing
                        ? "Não foi possível salvar a categoria. Tente novamente."
                        : "Não foi possível cadastrar a categoria. Tente novamente.")
                );
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title={isEditing ? "Editar categoria" : "Nova categoria"}
            description={
                isEditing
                    ? "O nome novo aparece em todas as transações desta categoria."
                    : "Use categorias para entender para onde vai o seu dinheiro."
            }
            onClose={onClose}
            closeDisabled={saving}
        >
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <label htmlFor="category-name">Nome da categoria</label>

                <input
                    autoComplete="off"
                    id="category-name"
                    ref={inputRef}
                    type="text"
                    placeholder="Ex.: Alimentação, Contas da casa..."
                    maxLength={MAX_LENGTH}
                    value={value}
                    className={visibleError ? "input-error" : ""}
                    aria-invalid={Boolean(visibleError)}
                    aria-describedby="category-name-help"
                    onChange={(event) => {
                        setValue(event.target.value);
                        setTouched(true);
                        setServerError("");
                    }}
                    disabled={saving}
                />

                <div className="field-help" id="category-name-help">
                    {visibleError ? (
                        <span className="field-error" role="alert">{visibleError}</span>
                    ) : (
                        <span>Letras e espaços. Acentos são aceitos.</span>
                    )}

                    <span className="field-counter">
                        {value.length}/{MAX_LENGTH}
                    </span>
                </div>

                <label htmlFor="category-budget">Orçamento mensal (opcional)</label>

                <CurrencyInput
                    id="category-budget"
                    value={budget}
                    className={budgetError ? "input-error" : ""}
                    aria-invalid={Boolean(budgetError)}
                    aria-describedby="category-budget-help"
                    disabled={saving}
                    onChange={(digits) => {
                        setBudget(digits);
                        setBudgetError("");
                    }}
                />

                <div className="field-help" id="category-budget-help">
                    {budgetError ? (
                        <span className="field-error" role="alert">{budgetError}</span>
                    ) : (
                        <span>Limite de gastos por mês. Deixe vazio para não acompanhar.</span>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving || unchanged || (touched && Boolean(validationError))}
                    >
                        {saving
                            ? "Salvando..."
                            : isEditing
                                ? "Salvar alterações"
                                : "Criar categoria"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default CategoryFormModal;
