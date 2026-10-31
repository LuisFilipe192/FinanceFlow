import { apiRequest } from "./api";

export function getTransactions() {
    return apiRequest("/transactions/", {
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

export function deleteTransaction(id) {
    return apiRequest(`/transactions/${id}/`, {
        method: "DELETE",
        fallbackError: "Não foi possível excluir a transação.",
    });
}

export function getCategories() {
    return apiRequest("/categories/", {
        fallbackError: "Erro ao buscar categorias.",
    });
}

export function createCategory(name) {
    return apiRequest("/categories/", {
        method: "POST",
        body: { name },
        fallbackError: "Não foi possível cadastrar a categoria.",
    });
}

export function deleteCategory(id) {
    return apiRequest("/categories/", {
        method: "DELETE",
        body: { id },
        fallbackError: "Não foi possível excluir a categoria.",
    });
}
