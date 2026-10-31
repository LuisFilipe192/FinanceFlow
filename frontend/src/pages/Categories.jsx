import { useEffect, useState } from "react";
import { Lock, Pencil, Plus, Tags, Trash2 } from "lucide-react";

import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import CategoryFormModal from "../components/categories/CategoryFormModal";
import { useToast } from "../context/ToastContext";
import {
    getCategories,
    deleteCategory
} from "../services/transactions";

// Categoria criada pelo backend que recebe as transações de categorias
// excluídas. Por isso não pode ser renomeada nem excluída.
const DEFAULT_CATEGORY_NAME = "Transferências";

function sortByName(categories) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function Categories() {
    const showToast = useToast();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // showForm abre o modal; editingCategory diz se é renomear (objeto) ou criar (null).
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
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

    function openCreateForm() {
        setEditingCategory(null);
        setShowForm(true);
    }

    function openEditForm(category) {
        setEditingCategory(category);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingCategory(null);
    }

    function handleCategorySaved(savedCategory, previousCategory) {
        setCategories((previous) =>
            sortByName(
                previousCategory
                    ? previous.map((category) =>
                        category.id === savedCategory.id ? savedCategory : category
                    )
                    : [...previous, savedCategory]
            )
        );

        closeForm();

        showToast({
            type: "success",
            message: previousCategory
                ? `"${previousCategory.name}" agora se chama "${savedCategory.name}".`
                : `Categoria "${savedCategory.name}" criada.`,
        });
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

            showToast({
                type: "success",
                message: "Categoria excluída com sucesso."
            });

        } catch (error) {
            console.error(error);

            showToast({
                type: "error",
                message: error.message
            });

        } finally {
            setDeleting(false);
        }
    }

    function renderList() {
        if (loading) {
            return <SkeletonRows rows={4} />;
        }

        if (error) {
            return <EmptyState title={error} />;
        }

        if (categories.length === 0) {
            return (
                <EmptyState
                    icon={<Tags size={24} />}
                    title="Nenhuma categoria cadastrada"
                    description="Categorias ajudam a entender para onde vai o seu dinheiro."
                    action={
                        <button className="primary-button" onClick={openCreateForm}>
                            <Plus size={18} />
                            Criar primeira categoria
                        </button>
                    }
                />
            );
        }

        return (
            <div className="transactions-list">
                {categories.map((category) => {
                    const isDefault = category.name === DEFAULT_CATEGORY_NAME;

                    return (
                        <div className="transaction-row" key={category.id}>
                            <div className="transaction-icon category">
                                <Tags size={20} />
                            </div>

                            {/* Duplo clique no nome é um atalho para renomear. */}
                            <div
                                className="transaction-info"
                                onDoubleClick={isDefault ? undefined : () => openEditForm(category)}
                            >
                                <strong>
                                    {category.name}
                                    {isDefault && (
                                        <span className="badge">Padrão</span>
                                    )}
                                </strong>
                                <div className="transaction-meta">
                                    <span>
                                        {isDefault
                                            ? "Usada quando nenhuma categoria é escolhida"
                                            : "Categoria financeira"}
                                    </span>
                                </div>
                            </div>

                            {isDefault ? (
                                <span
                                    className="row-locked"
                                    title="Categoria padrão: não pode ser renomeada nem excluída"
                                >
                                    <Lock size={14} />
                                    Protegida
                                </span>
                            ) : (
                                <div className="row-actions">
                                    <button
                                        type="button"
                                        className="row-action"
                                        aria-label={`Renomear categoria ${category.name}`}
                                        title="Renomear"
                                        onClick={() => openEditForm(category)}
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        className="row-action danger"
                                        aria-label={`Excluir categoria ${category.name}`}
                                        title="Excluir categoria"
                                        onClick={() => setCategoryToDelete(category)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    const countLabel = categories.length === 1
        ? "1 categoria cadastrada"
        : `${categories.length} categorias cadastradas`;

    return (
        <section className="dashboard-section">
            <div className="section-heading">
                <div>
                    <span className="section-overline">
                        03 / ORGANIZATION
                    </span>
                    <h2>Categorias</h2>
                    <p>Organize suas receitas e despesas.</p>
                </div>

                <button className="primary-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Nova categoria
                </button>
            </div>

            <div className="transactions-table-card">
                <div className="transactions-table-header">
                    <h3>Minhas categorias</h3>
                    {!loading && !error && <span>{countLabel}</span>}
                </div>
                <div className="transactions-header-divider"></div>

                {renderList()}
            </div>

            {showForm && (
                <CategoryFormModal
                    category={editingCategory}
                    categories={categories}
                    onSaved={handleCategorySaved}
                    onClose={closeForm}
                />
            )}

            {categoryToDelete && (
                <ConfirmDialog
                    title="Excluir categoria?"
                    description={`Tem certeza que deseja excluir "${categoryToDelete.name}"? As transações dela passam para ${DEFAULT_CATEGORY_NAME}.`}
                    confirmLabel="Excluir categoria"
                    loadingLabel="Excluindo..."
                    loading={deleting}
                    onConfirm={handleDeleteCategory}
                    onCancel={() => setCategoryToDelete(null)}
                />
            )}
        </section>
    );
}

export default Categories;
