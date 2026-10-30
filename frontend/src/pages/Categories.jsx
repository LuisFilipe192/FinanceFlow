import { useEffect, useState } from "react";
import { Plus, Tags, X, Trash2 } from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
    getCategories,
    createCategory,
    deleteCategory
} from "../services/transactions";

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryError, setCategoryError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadCategories() {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (error) {
                console.error(error);

                try {
                    const data = JSON.parse(error.message);
                    setCategoryError(
                        data.name || "Não foi possível cadastrar a categoria."
                    );
                } catch {
                    setCategoryError("Não foi possível cadastrar a categoria.");
                }
            } finally {
                setLoading(false);
            }
        }

        loadCategories();
    }, []);

    
    async function handleCreateCategory(event) {
        event.preventDefault();

        const name = newCategoryName.trim();

        if (!name) {
            setCategoryError("Informe o nome da categoria.");
            return;
        }

        if (!/^[\p{L}]+$/u.test(name)) {
            setCategoryError(
                "Use apenas letras, sem espaços, números ou caracteres especiais."
            );
            return;
        }

        if (name.length > 100) {
            setCategoryError("Use no máximo 100 caracteres.");
            return;
        }

        const alreadyExists = categories.some(
            (category) =>
                category.name.toLocaleLowerCase("pt-BR") ===
                name.toLocaleLowerCase("pt-BR")
        );

        if (alreadyExists) {
            setCategoryError("Essa categoria já está cadastrada.");
            return;
        }

        try {
            setSaving(true);
            setCategoryError("");

            const newCategory = await createCategory(name);

            setCategories((previous) => [...previous, newCategory]);
            setNewCategoryName("");
            setShowModal(false);

        } catch (error) {
            console.error(error);
            setCategoryError("Não foi possível cadastrar a categoria.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteCategory(id) {
        const confirmed = window.confirm(
            "Tem certeza que deseja excluir esta categoria?"
        );

        if (!confirmed) return;

        try {
            await deleteCategory(id);

            setCategories((previous) =>
                previous.filter((category) => category.id !== id)
            );

        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="main-content">
                <Header />

                <div className="page-content">
                    <div className="transactions-toolbar">
                        <div>
                            <h2>Categorias</h2>
                            <p>Organize suas receitas e despesas.</p>
                        </div>
                        <button
                            className="primary-button"
                            onClick={() => {
                                setShowModal(true);
                                setCategoryError("");
                                setNewCategoryName("");
                            }}
                        >
                            <Plus size={18} />
                            Nova categoria
                        </button>
                    </div>

                    <div className="transactions-table-card">
                        <div className="transactions-table-header">
                            <div>
                                <h3>Minhas categorias</h3>
                                <p>
                                    {categories.length} categorias cadastradas
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <p>Carregando categorias...</p>
                        ) : error ? (
                            <p className="form-error">{error}</p>
                        ) : categories.length === 0 ? (
                            <div className="transactions-empty">
                                <Tags size={32} />
                                <h3>Nenhuma categoria cadastrada</h3>
                                <p>Comece criando sua primeira categoria.</p>
                            </div>
                        ) : (
                            <div className="transactions-list">
                                {categories.map((category) => (
                                    <div
                                        className="transaction-row"
                                        key={category.id}
                                    >
                                        <div className="transaction-icon">
                                            <Tags size={20} />
                                        </div>

                                        <div className="transaction-info">
                                            <strong>{category.name}</strong>
                                            <span>Categoria financeira</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="modal-close"
                                            title="Excluir categoria"
                                            onClick={() => handleDeleteCategory(category.id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {showModal && (
                        <div className="modal-overlay">
                            <div className="transaction-modal">
                                <div className="modal-header">
                                    <div>
                                        <h2>Nova categoria</h2>
                                        <p>Cadastre uma nova categoria financeira.</p>
                                    </div>

                                    <button
                                        type="button"
                                        className="modal-close"
                                        disabled={saving}
                                        onClick={() => {
                                            setShowModal(false);
                                            setNewCategoryName("");
                                            setCategoryError("");
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateCategory}>
                                    <label>Nome da categoria</label>

                                    <input
                                        type="text"
                                        placeholder="Ex.: Alimentação, Transporte..."
                                        maxLength={100}
                                        value={newCategoryName}
                                        onChange={(event) => {
                                            setNewCategoryName(event.target.value);
                                            setCategoryError("");
                                        }}
                                        required
                                    />

                                    {categoryError && (
                                        <span className="field-error">
                                            {categoryError}
                                        </span>
                                    )}

                                    <div className="modal-actions">
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            disabled={saving}
                                            onClick={() => {
                                                setShowModal(false);
                                                setNewCategoryName("");
                                                setCategoryError("");
                                            }}
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            className="primary-button"
                                            disabled={saving}
                                        >
                                            {saving ? "Salvando..." : "Salvar categoria"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Categories;