import { expect, test } from "@playwright/test";

import { createExpense, fillLogin, login } from "./support/helpers.js";
import { E2E_USER } from "./support/users.js";

async function openUserMenu(page) {
    await page.getByRole("button", { name: `Conta de ${E2E_USER.username}` }).click();
    return page.getByRole("menu");
}

test.describe("Usuário logado e logout", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test("avatar mostra as iniciais e o menu mostra o usuário", async ({ page }) => {
        // "e2e_teste" -> partes "e2e" e "teste" -> "ET"
        const avatar = page.getByRole("button", { name: `Conta de ${E2E_USER.username}` });
        await expect(avatar).toHaveText("ET");

        const menu = await openUserMenu(page);
        await expect(menu).toContainText("Conectado como");
        await expect(menu).toContainText(E2E_USER.username);

        // Esc fecha e devolve o foco ao avatar.
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(avatar).toBeFocused();
    });

    test("Sair encerra a sessão e as páginas privadas voltam a pedir login", async ({ page }) => {
        const menu = await openUserMenu(page);
        await menu.getByRole("menuitem", { name: "Sair" }).click();

        await expect(page).toHaveURL("/login");
        await expect(page.getByText(`Até logo, ${E2E_USER.username}!`)).toBeVisible();

        await page.goto("/");
        await expect(page).toHaveURL("/login");
    });

    test("exclusão aguardando o Desfazer é concluída antes do logout", async ({ page }) => {
        const description = `Logout e2e ${Date.now()}`;

        await page.goto("/transactions");
        const row = await createExpense(page, description);

        await row.hover();
        await row.getByRole("button", { name: `Excluir ${description}` }).click();
        await expect(row).toBeHidden();

        // Sai antes dos 5 segundos do "Desfazer".
        const menu = await openUserMenu(page);
        await menu.getByRole("menuitem", { name: "Sair" }).click();
        await expect(page).toHaveURL("/login");

        // Entra de novo: a transação não pode ter voltado.
        await fillLogin(page, E2E_USER);
        // Espera o login terminar antes de navegar (senão a página recarrega
        // no meio da requisição e a sessão ainda não existe).
        await expect(page).toHaveURL("/");
        await page.goto("/transactions");
        await expect(page.getByRole("heading", { name: "Histórico de transações" })).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: description })).toHaveCount(0);
    });
});
