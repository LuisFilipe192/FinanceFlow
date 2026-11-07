import { useState } from "react";
import { Plus } from "lucide-react";

import Select from "../Select";
import { createCategory } from "../../services/transactions";

function CategoryPicker({ id, value, categories, placeholder, className, onChange, onCategoryCreated }) {
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    function closeCreator() {
        setCreating(false);
        setName("");
        setError("");
    }

    async function handleCreate() {
        // Mesma regra do backend: letras (com acentos) separadas por um espaço.
        const cleanName = name.trim().replace(/\s+/g, " ");

        if (!cleanName) {
            setError("Informe o nome da categoria.");
            return;
        }

        if (!/^\p{L}+(?: \p{L}+)*$/u.test(cleanName)) {
            setError("Use apenas letras e espaços.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const category = await createCategory(cleanName);

            onCategoryCreated(category);
            onChange(String(category.id));
            closeCreator();
        } catch (requestError) {
            console.error(requestError);
            setError(requestError.data?.name || "Não foi possível cadastrar a categoria.");
        } finally {
            setSaving(false);
        }
    }

    if (!creating) {
        return (
            <>
                <Select
                    id={id}
                    className={className}
                    value={value}
                    options={categories.map((category) => ({
                        value: String(category.id),
                        label: category.name,
                    }))}
                    placeholder={placeholder}
                    onChange={onChange}
                />

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setCreating(true)}
                >
                    <Plus size={16} />
                    Criar nova categoria
                </button>
            </>
        );
    }

    return (
        <div className="category-create-form">
            <label htmlFor={`${id}-new`}>Nome da nova categoria</label>

            <input
                autoComplete="off"
                id={`${id}-new`}
                type="text"
                placeholder="Digite o nome da categoria"
                maxLength={100}
                autoFocus
                value={name}
                onChange={(event) => {
                    const typed = event.target.value;

                    if (/[0-9]/.test(typed)) {
                        setError("Não são permitidos números. Digite apenas letras.");
                        return;
                    }

                    setName(typed);
                    setError("");
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreate();
                    }
                }}
            />

            <button
                type="button"
                className="primary-button"
                onClick={handleCreate}
                disabled={saving}
            >
                {saving ? "Salvando..." : "Salvar categoria"}
            </button>

            <button
                type="button"
                className="secondary-button"
                onClick={closeCreator}
                disabled={saving}
            >
                Cancelar
            </button>

            {error && <span className="field-error" role="alert">{error}</span>}
        </div>
    );
}

export default CategoryPicker;
