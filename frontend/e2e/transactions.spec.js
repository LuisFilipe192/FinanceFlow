import { expect, test } from "@playwright/test";

import { createExpense, login, money } from "./support/helpers.js";

test.describe("Transações", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto("/transactions");
        await expect(page.getByRole("heading", { name: "Histórico de transações" })).toBeVisible();
    });

    test("tecla N abre o formulário, que formata o valor e descreve a ação", async ({ page }) => {
        const description = `Mercado e2e ${Date.now()}`;

        await page.keyboard.press("n");

        const dialog = page.getByRole("dialog", { name: "Nova transação" });
        await expect(dialog).toBeVisible();
        // O foco vai direto para o primeiro campo.
        await expect(dialog.getByLabel("Descrição")).toBeFocused();

        await dialog.getByRole("button", { name: "Despesa" }).click();
        await dialog.getByLabel("Descrição").fill(description);
        await dialog.getByLabel("Valor").fill("12550");

        await expect(dialog.getByLabel("Valor")).toHaveValue(money("R$ 125,50"));
        await expect(
            dialog.getByRole("button", { name: money("Adicionar despesa de R$ 125,50") })
        ).toBeVisible();

        await dialog.getByRole("button", { name: /Adicionar despesa/ }).click();

        // O usuário de teste é novo a cada execução: se esta for a primeira
        // transação dele, o aviso é a mensagem especial de boas-vindas.
        await expect(
            page.getByText(/Primeira transação registrada!|Despesa de R\$\s125,50 registrada/)
        ).toBeVisible();
        const group = page.locator(".transaction-group", { hasText: "Hoje" });
        await expect(group.locator(".transaction-row", { hasText: description })).toBeVisible();
    });

    test("formulário vazio mostra mensagens que explicam o que falta", async ({ page }) => {
        await page.getByRole("button", { name: /Nova transação/ }).click();
        const dialog = page.getByRole("dialog", { name: "Nova transação" });

        await dialog.getByRole("button", { name: "Despesa" }).click();
        await dialog.getByRole("button", { name: /Adicionar despesa/ }).click();

        await expect(dialog.getByText("Com o que foi esse gasto? Ex.: Mercado, almoço.")).toBeVisible();
        await expect(dialog.getByText("Qual foi o valor? Digite os números.")).toBeVisible();
    });

    test("editar atualiza a linha na lista", async ({ page }) => {
        const description = `Farmácia e2e ${Date.now()}`;
        const row = await createExpense(page, description);

        await row.hover();
        await row.getByRole("button", { name: `Editar ${description}` }).click();

        const dialog = page.getByRole("dialog", { name: "Editar transação" });
        await expect(dialog.getByLabel("Descrição")).toHaveValue(description);
        await dialog.getByLabel("Descrição").fill(`${description} editada`);
        await dialog.getByRole("button", { name: "Salvar alterações" }).click();

        await expect(page.getByText(/Transação atualizada/)).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: `${description} editada` })).toBeVisible();
    });

    test("excluir e desfazer devolve a transação", async ({ page }) => {
        const description = `Cinema e2e ${Date.now()}`;
        const row = await createExpense(page, description);

        await row.hover();
        await row.getByRole("button", { name: `Excluir ${description}` }).click();
        await expect(row).toBeHidden();

        await page.getByRole("button", { name: "Desfazer" }).click();

        await expect(page.getByText("Pronto, a transação voltou.")).toBeVisible();
        await expect(row).toBeVisible();

        // Depois de recarregar, continua lá: o servidor nunca foi chamado.
        await page.reload();
        await expect(page.locator(".transaction-row", { hasText: description })).toBeVisible();
    });

    test("sem desfazer, a exclusão vai para o servidor após 5 segundos", async ({ page }) => {
        const description = `Padaria e2e ${Date.now()}`;
        const row = await createExpense(page, description);

        await row.hover();
        await row.getByRole("button", { name: `Excluir ${description}` }).click();
        await expect(row).toBeHidden();

        const deleted = page.waitForResponse(
            (response) =>
                response.request().method() === "DELETE" &&
                response.url().includes("/api/transactions/"),
            { timeout: 8_000 }
        );
        expect((await deleted).status()).toBe(204);

        await page.reload();
        await expect(page.getByRole("heading", { name: "Histórico de transações" })).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: description })).toHaveCount(0);
    });

    test("Esc fecha o modal e o foco volta ao botão que abriu", async ({ page }) => {
        const openButton = page.getByRole("button", { name: /Nova transação/ });

        await openButton.click();
        await expect(page.getByRole("dialog")).toBeVisible();

        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(openButton).toBeFocused();
    });
});
