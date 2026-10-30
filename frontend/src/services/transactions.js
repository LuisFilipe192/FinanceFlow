
const API_URL = "http://localhost:8000/api";

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
        },
        body: JSON.stringify({ id }),
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Não foi possível excluir a categoria.");
    }

    return true;
}