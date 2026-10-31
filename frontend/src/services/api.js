// Definida em frontend/.env (veja .env.example). O valor padrão mantém o
// ambiente local funcionando sem configuração extra.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const SESSION_ERROR = "Sessão expirada ou usuário não autenticado.";

export function getCsrfToken() {
    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="));

    return cookie ? cookie.split("=")[1] : "";
}

function getErrorMessage(status, data, fallbackError, useServerMessage) {
    // Nos endpoints de autenticação o próprio Django escreve a mensagem
    // (ex.: 401 = "Usuário ou senha inválidos."), então ela é usada como veio.
    if (useServerMessage) {
        return data?.detail || data?.error || fallbackError;
    }

    if (status === 401 || status === 403) {
        return SESSION_ERROR;
    }

    return data?.error || data?.detail || fallbackError;
}

// Ponto único de comunicação com o Django: envia o cookie de sessão,
// o token CSRF nas requisições que alteram dados e converte erros em Error.
export async function apiRequest(path, {
    method = "GET",
    body,
    signal,
    // keepalive deixa a requisição terminar mesmo se a aba for fechada.
    keepalive = false,
    fallbackError = "Não foi possível completar a operação.",
    useServerMessage = false,
} = {}) {
    const headers = { Accept: "application/json" };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (method !== "GET") {
        headers["X-CSRFToken"] = getCsrfToken();
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        credentials: "include",
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
        keepalive,
    });

    // 204 (exclusões) não tem corpo; outras respostas podem não ser JSON.
    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            getErrorMessage(response.status, data, fallbackError, useServerMessage)
        );
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}
