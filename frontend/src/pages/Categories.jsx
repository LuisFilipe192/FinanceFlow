import { useEffect, useState } from "react";
import { AlertTriangle, Lock, Pencil, Plus, Tags, Trash2 } from "lucide-react";

import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import PageActions from "../components/PageActions";
import { SkeletonRows } from "../components/Skeleton";
import CategoryFormModal from "../components/categories/CategoryFormModal";
import { useToast } from "../context/ToastContext";
import { getDashboard } from "../services/dashboard";
import {
    getCategories,
    deleteCategory
} from "../services/transactions";
import { DEFAULT_CATEGORY_NAME } from "../utils/categories";
import { getBudgetStatus } from "../utils/budget";
import { getCategoryColorMap } from "../utils/categoryColors";
import { formatCurrency, pluralize } from "../utils/format";
import { MONTH_NAMES } from "../utils/insights";

function sortByName(categories) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function Categories() {
    const showToast = useToast();

    const [categories, setCategories] = useState([]);
    const [monthSpending, setMonthSpending] = useState(() => new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // showForm abre o modal; editingCategory diz se é renomear (objeto) ou criar (null).
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        async function loadCategories() {
            try {
                const [data, dashboard] = await Promise.all([
                    getCategories({ signal }),
                    getDashboard({ signal }).catch((dashboardError) => {
                        if (dashboardError.name === "AbortError") throw dashboardError;
                        return null;
                    }),
                ]);

                setCategories(data);
                setMonthSpending(new Map(
                    (dashboard?.expenses_by_category ?? []).map((item) => [item.category_id, Number(item.total)])
                ));
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error(error);
                    setError("Não foi possível carregar as categorias.");
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadCategories();

        return () => controller.abort();
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

        let message = `Categoria "${savedCategory.name}" criada.`;

        if (previousCategory) {
            message = previousCategory.name !== savedCategory.name
                ? `"${previousCategory.name}" agora se chama "${savedCategory.name}".`
                : `Categoria "${savedCategory.name}" atualizada.`;
        }

        showToast({ type: "success", message });
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

            const defaultCategory = categories.find((category) => category.name === DEFAULT_CATEGORY_NAME);
            setMonthSpending((previous) => {
                const next = new Map(previous);
                const moved = next.get(categoryToDelete.id) ?? 0;

                next.delete(categoryToDelete.id);
                if (defaultCategory && moved > 0) {
                    next.set(defaultCategory.id, (next.get(defaultCategory.id) ?? 0) + moved);
                }

                return next;
            });

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

        const colorMap = getCategoryColorMap(categories);
        const monthTotal = [...monthSpending.values()].reduce((total, value) => total + value, 0);
        const monthName = MONTH_NAMES[new Date().getMonth()];

        return (
            <div className="transactions-list">
                {categories.map((category) => {
                    const isDefault = category.name === DEFAULT_CATEGORY_NAME;
                    const spent = monthSpending.get(category.id) ?? 0;
                    const share = monthTotal > 0 ? spent / monthTotal : 0;
                    const budget = getBudgetStatus(spent, category.monthly_budget);

                    return (
                        <div
                            className="transaction-row category-row"
                            key={category.id}
                            style={{ "--category-color": colorMap.get(category.id) }}
                        >
                            <div className="transaction-icon category">
                                <Tags size={18} />
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
                                {budget ? (
                                    <>
                                        <div className="transaction-meta">
                                            <span>
                                                {formatCurrency(spent)} de {formatCurrency(category.monthly_budget)} em {monthName}
                                            </span>
                                            <span className={`budget-status ${budget.level}`}>
                                                {budget.level !== "ok" && <AlertTriangle size={12} />}
                                                {budget.level === "over"
                                                    ? `Passou ${formatCurrency(-budget.remaining)}`
                                                    : budget.remaining === 0
                                                        ? "Limite atingido"
                                                        : `Restam ${formatCurrency(budget.remaining)}`}
                                            </span>
                                        </div>

                                        <div
                                            className={`category-share ${budget.level}`}
                                            role="img"
                                            aria-label={`${Math.round(budget.ratio * 100)}% do orçamento de ${monthName}`}
                                        >
                                            <span style={{ width: `${Math.min(Math.max(budget.ratio * 100, 2), 100)}%` }} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="transaction-meta">
                                        <span>
                                            {spent > 0
                                                ? `${formatCurrency(spent)} em ${monthName} · ${Math.round(share * 100)}% do total`
                                                : `Sem gastos em ${monthName}`}
                                        </span>
                                        {isDefault && <span className="category-note">Usada quando nenhuma categoria é escolhida</span>}
                                    </div>
                                )}
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
                                        aria-label={`Editar categoria ${category.name}`}
                                        title="Editar"
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

    const countLabel = pluralize(categories.length, "categoria cadastrada", "categorias cadastradas");

    return (
        <section className="dashboard-section">
            <PageActions>
                <button className="primary-button" onClick={openCreateForm}>
                    <Plus size={18} />
                    Nova categoria
                </button>
            </PageActions>

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
