import { apiRequest } from "./api";

export function getTransactions({ signal } = {}) {
    return apiRequest("/transactions/", {
        signal,
        fallbackError: "Erro ao buscar transações.",
    });
}

export function createTransaction(transaction) {
    return apiRequest("/transactions/", {
        method: "POST",
        body: transaction,
        fallbackError: "Não foi possível salvar a transação.",
    });
}

export function updateTransaction(id, transaction) {
    return apiRequest(`/transactions/${id}/`, {
        method: "PATCH",
        body: transaction,
        fallbackError: "Não foi possível salvar a transação.",
    });
}

export function deleteTransaction(id, { keepalive = false } = {}) {
    return apiRequest(`/transactions/${id}/`, {
        method: "DELETE",
        keepalive,
        fallbackError: "Não foi possível excluir a transação.",
    });
}

export function getCategories({ signal } = {}) {
    return apiRequest("/categories/", {
        signal,
        fallbackError: "Erro ao buscar categorias.",
    });
}

export function createCategory(name, monthlyBudget = null) {
    return apiRequest("/categories/", {
        method: "POST",
        body: { name, monthly_budget: monthlyBudget },
        fallbackError: "Não foi possível cadastrar a categoria.",
    });
}

export function updateCategory(id, changes) {
    return apiRequest(`/categories/${id}/`, {
        method: "PATCH",
        body: changes,
        fallbackError: "Não foi possível salvar a categoria.",
    });
}

export function deleteCategory(id) {
    return apiRequest("/categories/", {
        method: "DELETE",
        body: { id },
        fallbackError: "Não foi possível excluir a categoria.",
    });
}
