import { useEffect, useState } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";

import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import {
    getCategories,
    createCategory,
    deleteCategory
} from "../services/transactions";

import Notification from "../components/Notification";

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categoryError, setCategoryError] = useState("");
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        async function loadCategories() {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (error) {
                console.error(error);
                setError("Não foi possível carregar as categorias.");
            } finally {
                setLoading(false);
            }
        }

        loadCategories();
    }, []);

    
    async function handleCreateCategory(event) {
        event.preventDefault();

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

    function closeCreateModal() {
        setShowModal(false);
        setNewCategoryName("");
        setCategoryError("");
    }

    async function handleDeleteCategory() {
        if (!categoryToDelete) return;

        try {
            setDeleting(true);

            await deleteCategory(categoryToDelete.id);

            setCategories((previous) =>
                previous.filter(
                    (category) => category.id !== categoryToDelete.id
                )
            );

            setCategoryToDelete(null);

            setNotification({
                type: "success",
                message: "Categoria excluída com sucesso."
            });

        } catch (error) {
            console.error(error);

            setNotification({
                type: "error",
                message: error.message
            });

        } finally {
            setDeleting(false);
        }
    }

    return (
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
                                    onClick={() => setCategoryToDelete(category)}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showModal && (
                <Modal
                    title="Nova categoria"
                    description="Cadastre uma nova categoria financeira."
                    onClose={closeCreateModal}
                    closeDisabled={saving}
                >
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
                                onClick={closeCreateModal}
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
                </Modal>
            )}
            {categoryToDelete && (
                <ConfirmDialog
                    title="Excluir categoria?"
                    description={`Tem certeza que deseja excluir "${categoryToDelete.name}"?`}
                    confirmLabel="Excluir categoria"
                    loadingLabel="Excluindo..."
                    loading={deleting}
                    onConfirm={handleDeleteCategory}
                    onCancel={() => setCategoryToDelete(null)}
                />
            )}
            {notification && (
                <Notification
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
}

export default Categories;