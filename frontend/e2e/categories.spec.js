import { expect, test } from "@playwright/test";

import { login, uniqueLetters } from "./support/helpers.js";

test.describe("Categorias", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto("/categories");
        await expect(page.getByRole("heading", { name: "Minhas categorias" })).toBeVisible();
    });

    test("cria e renomeia uma categoria", async ({ page }) => {
        const name = `Lazer ${uniqueLetters()}`;
        const newName = `Viagens ${uniqueLetters()}`;

        await page.getByRole("button", { name: "Nova categoria" }).click();
        const createDialog = page.getByRole("dialog", { name: "Nova categoria" });
        await createDialog.getByLabel("Nome da categoria").fill(name);
        await createDialog.getByRole("button", { name: "Criar categoria" }).click();

        await expect(page.getByText(`Categoria "${name}" criada.`)).toBeVisible();

        const row = page.locator(".transaction-row", { hasText: name });
        await row.hover();
        await row.getByRole("button", { name: `Renomear categoria ${name}` }).click();

        const renameDialog = page.getByRole("dialog", { name: "Renomear categoria" });
        const input = renameDialog.getByLabel("Nome da categoria");
        await expect(input).toHaveValue(name);

        // Sem mudar nada, não dá para salvar.
        await expect(renameDialog.getByRole("button", { name: "Salvar nome" })).toBeDisabled();

        await input.fill(newName);
        await renameDialog.getByRole("button", { name: "Salvar nome" }).click();

        await expect(page.getByText(`"${name}" agora se chama "${newName}".`)).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: newName })).toBeVisible();
    });

    test("nome duplicado é avisado enquanto digita", async ({ page }) => {
        await page.getByRole("button", { name: "Nova categoria" }).click();
        const dialog = page.getByRole("dialog", { name: "Nova categoria" });

        await dialog.getByLabel("Nome da categoria").fill("transferências");

        await expect(dialog.getByText('Você já tem a categoria "Transferências".')).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Criar categoria" })).toBeDisabled();
    });

    test("números no nome são recusados com mensagem específica", async ({ page }) => {
        await page.getByRole("button", { name: "Nova categoria" }).click();
        const dialog = page.getByRole("dialog", { name: "Nova categoria" });

        await dialog.getByLabel("Nome da categoria").fill("Casa 2");

        await expect(dialog.getByText("Números não são permitidos. Use apenas letras.")).toBeVisible();
    });

    test("Transferências é protegida: sem renomear nem excluir", async ({ page }) => {
        const row = page.locator(".transaction-row", { hasText: "Transferências" });

        await expect(row.getByText("Protegida")).toBeVisible();
        await expect(row.getByRole("button")).toHaveCount(0);
    });
});
