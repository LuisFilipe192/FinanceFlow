import { expect, test } from "@playwright/test";

import { createExpense, login, money } from "./support/helpers.js";

test.describe("Transações", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto("/transactions");
        await expect(page.getByRole("heading", { name: "Histórico de transações" })).toBeVisible();
    });

    test("compra parcelada aparece mês a mês e exclui esta e as próximas", async ({ page }) => {
        const description = `Celular e2e ${Date.now()}`;
        const row = page.locator(".transaction-row", { hasText: description });
        const nextMonth = page.getByRole("button", { name: "Próximo mês" });
        const previousMonth = page.getByRole("button", { name: "Mês anterior" });

        await page.getByRole("button", { name: /Nova transação/ }).click();

        const dialog = page.getByRole("dialog", { name: "Nova transação" });
        await dialog.getByRole("button", { name: "Despesa" }).click();
        await dialog.getByRole("button", { name: "Parcelada" }).click();
        await dialog.getByLabel("Descrição").fill(description);
        await dialog.getByLabel("Valor da parcela").fill("15000");

        await dialog.getByRole("button", { name: "Adicionar parcelas" }).click();
        await expect(dialog.getByText("Escolha de 2 a 60 parcelas.")).toBeVisible();

        await dialog.getByLabel("Número de parcelas").fill("3");
        await expect(dialog.getByText(money("Total de R$ 450,00"), { exact: false })).toBeVisible();
        await dialog.getByRole("button", { name: money("Adicionar 3 parcelas de R$ 150,00") }).click();

        await expect(page.getByText(money("3 parcelas de R$ 150,00 registradas."), { exact: false })).toBeVisible();
        await expect(row).toContainText("Parcela 1 de 3");

        await nextMonth.click();
        await expect(row).toContainText("Parcela 2 de 3");

        await row.hover();
        await row.getByRole("button", { name: `Excluir ${description}` }).click();

        const confirm = page.getByRole("dialog", { name: "Excluir parcela?" });
        await confirm.getByRole("button", { name: "Esta e as próximas" }).click();
        await expect(confirm).toBeHidden();
        await expect(row).toBeHidden();

        await nextMonth.click();
        await expect(page.locator(".period-label")).toBeVisible();
        await expect(row).toBeHidden();

        await previousMonth.click();
        await previousMonth.click();
        await expect(row).toContainText("Parcela 1 de 3");
    });

    test("campos financeiros não mostram o histórico do navegador", async ({ page }) => {
        await expect(page.getByPlaceholder(/Buscar/)).toHaveAttribute("autocomplete", "off");

        await page.getByRole("button", { name: /Nova transação/ }).click();

        const dialog = page.getByRole("dialog", { name: "Nova transação" });
        await dialog.getByRole("button", { name: "Despesa" }).click();
        await dialog.getByRole("button", { name: "Parcelada" }).click();

        const inputs = dialog.locator("input");
        await expect(inputs).toHaveCount(4);

        for (const input of await inputs.all()) {
            await expect(input).toHaveAttribute("autocomplete", "off");
        }
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

    test("mudar a data para outro mês tira a transação da lista e o aviso leva até ela", async ({ page }) => {
        const description = `Mudança de mês e2e ${Date.now()}`;
        const row = await createExpense(page, description);

        const today = new Date();
        const previous = new Date(today.getFullYear(), today.getMonth() - 1, 15);
        const typedDate = previous.toLocaleDateString("pt-BR");
        const previousMonthName = previous.toLocaleDateString("pt-BR", { month: "long" });

        await row.hover();
        await row.getByRole("button", { name: `Editar ${description}` }).click();

        const dialog = page.getByRole("dialog", { name: "Editar transação" });
        const dateInput = dialog.getByLabel("Data");
        await dateInput.fill(typedDate);
        await dateInput.press("Enter");
        await dialog.getByRole("button", { name: "Salvar alterações" }).click();

        const toast = page.locator(".notification", { hasText: `Ela está em ${previousMonthName} de ${previous.getFullYear()}.` });
        await expect(toast).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: description })).toHaveCount(0);

        await toast.getByRole("button", { name: "Ver" }).click();

        const periodLabel = page.locator(".period-label");
        await expect(periodLabel).toContainText(new RegExp(previousMonthName, "i"));
        await expect(page.locator(".transaction-row", { hasText: description })).toBeVisible();

        await page.getByRole("button", { name: "Próximo mês" }).click();
        await expect(page.locator(".transaction-row", { hasText: description })).toHaveCount(0);
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
