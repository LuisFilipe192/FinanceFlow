import { apiRequest, getCsrfToken } from "./api";

// Camada de autenticação do React. Ela não guarda senha, token nem dados do
// usuário no navegador (nada de localStorage): quem sabe se existe sessão é
// o Django, pelo cookie HttpOnly "sessionid", que o JavaScript nem consegue ler.
//
// Fluxo do CSRF:
//   1. GET /auth/csrf/ faz o Django criar o cookie "csrftoken".
//   2. Todo POST envia esse valor no cabeçalho X-CSRFToken (o apiRequest faz isso).
//   3. No login, o Django gera um token novo; o cookie é atualizado sozinho
//      e o próximo POST já lê o valor novo.

// Garante que o cookie csrftoken existe antes de um POST.
export async function ensureCsrfCookie() {
    if (getCsrfToken()) return;

    await apiRequest("/auth/csrf/", {
        fallbackError: "Não foi possível preparar a conexão segura.",
        useServerMessage: true,
    });
}

// Retorna { authenticated: boolean, user: { id, username } | null }.
export function getSession() {
    return apiRequest("/auth/session/", {
        fallbackError: "Não foi possível verificar sua sessão.",
        useServerMessage: true,
    });
}

export async function login({ username, password }) {
    await ensureCsrfCookie();

    return apiRequest("/auth/login/", {
        method: "POST",
        body: { username, password },
        fallbackError: "Não foi possível entrar. Tente novamente.",
        useServerMessage: true,
    });
}

// Em caso de erro de validação, error.data.errors traz as mensagens por campo:
// { username: [...], password: [...], password_confirmation: [...] }.
export async function register({ username, password, passwordConfirmation }) {
    await ensureCsrfCookie();

    return apiRequest("/auth/register/", {
        method: "POST",
        body: {
            username,
            password,
            password_confirmation: passwordConfirmation,
        },
        fallbackError: "Não foi possível criar sua conta. Tente novamente.",
        useServerMessage: true,
    });
}

export async function logout() {
    await ensureCsrfCookie();

    return apiRequest("/auth/logout/", {
        method: "POST",
        fallbackError: "Não foi possível sair. Tente novamente.",
        useServerMessage: true,
    });
}
