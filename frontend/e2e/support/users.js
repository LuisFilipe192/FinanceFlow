import { runDjangoShell } from "./django.js";

// Todo usuário criado pelos testes começa com este prefixo. Assim a limpeza
// apaga só o que os testes criaram, nunca as suas contas de verdade.
export const E2E_PREFIX = "e2e_";

export const E2E_USER = {
    username: "e2e_teste",
    password: "Fluxo!E2E-2026",
};

// Apagar o usuário apaga junto as transações e categorias dele (CASCADE).
// Funciona porque Transaction.category usa RESTRICT (com PROTECT dava erro).
export function deleteE2EUsers() {
    runDjangoShell(
        "from django.contrib.auth import get_user_model; " +
        `get_user_model().objects.filter(username__startswith="${E2E_PREFIX}").delete()`
    );
}

export function createE2EUser() {
    runDjangoShell(
        "from django.contrib.auth import get_user_model; " +
        "get_user_model().objects.create_user(" +
        `username="${E2E_USER.username}", password="${E2E_USER.password}")`
    );
}
