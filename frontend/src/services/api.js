// Definida em frontend/.env (veja .env.example). O valor padrão mantém o
// ambiente local funcionando sem configuração extra.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const SESSION_ERROR = "Sessão expirada ou usuário não autenticado.";

export const SESSION_CHECK_EVENT = "financeflow:session-check";

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

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            credentials: "include",
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal,
            keepalive,
        });
    } catch (error) {
        // Cancelamento proposital (AbortController) segue como está.
        if (error.name === "AbortError") throw error;

        // fetch só falha assim quando nem chegou ao servidor
        // (backend desligado, sem internet). A mensagem original é "Failed to fetch".
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            { cause: error }
        );
    }

    // 204 (exclusões) não tem corpo; outras respostas podem não ser JSON.
    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);

    // 401/403 fora das rotas de login pode ser sessão expirada. O AuthProvider
    // escuta este evento e confere com o Django (um 403 também pode ser falha
    // de CSRF, por isso ele pergunta em vez de deslogar direto).
    if ((response.status === 401 || response.status === 403) && !useServerMessage) {
        window.dispatchEvent(new Event(SESSION_CHECK_EVENT));
    }

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
