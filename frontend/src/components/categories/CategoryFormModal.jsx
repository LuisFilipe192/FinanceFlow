import { useEffect, useRef, useState } from "react";

import Modal from "../Modal";
import { createCategory, updateCategory } from "../../services/transactions";

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

// category = null cria uma categoria nova; um objeto renomeia a existente.
function CategoryFormModal({ category, categories, onSaved, onClose }) {
    const isEditing = Boolean(category);

    const [value, setValue] = useState(category ? category.name : "");
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
    const unchanged = isEditing && name === category.name;
    const visibleError = serverError || (touched ? validationError : "");

    async function handleSubmit(event) {
        event.preventDefault();
        setTouched(true);

        if (validationError || unchanged) return;

        try {
            setSaving(true);
            setServerError("");

            const savedCategory = isEditing
                ? await updateCategory(category.id, name)
                : await createCategory(name);

            onSaved(savedCategory, category);
        } catch (error) {
            console.error(error);
            // O backend responde { name: "mensagem" } quando a validação falha.
            setServerError(
                error.data?.name ||
                (isEditing
                    ? "Não foi possível renomear a categoria. Tente novamente."
                    : "Não foi possível cadastrar a categoria. Tente novamente.")
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            title={isEditing ? "Renomear categoria" : "Nova categoria"}
            description={
                isEditing
                    ? "O novo nome aparece em todas as transações desta categoria."
                    : "Use categorias para entender para onde vai o seu dinheiro."
            }
            onClose={onClose}
            closeDisabled={saving}
        >
            <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="category-name">Nome da categoria</label>

                <input
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
                                ? "Salvar nome"
                                : "Criar categoria"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default CategoryFormModal;
