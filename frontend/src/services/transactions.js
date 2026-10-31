const API_URL = "http://localhost:8000/api";

function getCsrfToken() {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="));

    return cookie ? cookie.split("=")[1] : "";
}

export async function getTransactions() {
    const response = await fetch(`${API_URL}/transactions/`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao buscar transações: ${response.status}`);
    }

    return response.json();
}

export async function getCategories() {
    const response = await fetch(`${API_URL}/categories/`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Erro ao buscar categorias: ${response.status}`);
    }

    return response.json();
}

export async function createTransaction(transaction) {
    const response = await fetch(`${API_URL}/transactions/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify(transaction),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            JSON.stringify(data)
        );
    }

    return data;
}

export async function createCategory(name) {
    const response = await fetch(`${API_URL}/categories/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ name }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data;
}

export async function deleteCategory(id) {
    const response = await fetch(`${API_URL}/categories/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ id }),
    });

    if (!response.ok) {
        const data = await response.json();

        throw new Error(
            data.error ||
            data.detail ||
            "Não foi possível excluir a categoria."
        );
    }

    return true;
}

export async function updateTransaction(id, transaction) {
    const response = await fetch(`${API_URL}/transactions/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify(transaction),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data));
    }

    return data;
}

export async function deleteTransaction(id) {
    const response = await fetch(`${API_URL}/transactions/${id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "X-CSRFToken": getCsrfToken(),
        },
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(
            data.error || data.detail || "Não foi possível excluir a transação."
        );
    }

    return true;
}