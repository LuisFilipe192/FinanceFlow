import { expect, test } from "@playwright/test";

import { login, uniqueLetters } from "./support/helpers.js";
import { runDjangoShell } from "./support/django.js";
import { E2E_USER } from "./support/users.js";

test.describe("Categorias", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto("/categories");
        await expect(page.getByRole("heading", { name: "Minhas categorias" })).toBeVisible();
    });

    test("cria e edita o nome de uma categoria", async ({ page }) => {
        const name = `Lazer ${uniqueLetters()}`;
        const newName = `Viagens ${uniqueLetters()}`;

        await page.getByRole("button", { name: "Nova categoria" }).click();
        const createDialog = page.getByRole("dialog", { name: "Nova categoria" });
        await createDialog.getByLabel("Nome da categoria").fill(name);
        await createDialog.getByRole("button", { name: "Criar categoria" }).click();

        await expect(page.getByText(`Categoria "${name}" criada.`)).toBeVisible();

        const row = page.locator(".transaction-row", { hasText: name });
        await row.hover();
        await row.getByRole("button", { name: `Editar categoria ${name}` }).click();

        const renameDialog = page.getByRole("dialog", { name: "Editar categoria" });
        const input = renameDialog.getByLabel("Nome da categoria");
        await expect(input).toHaveValue(name);

        // Sem mudar nada, não dá para salvar.
        await expect(renameDialog.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();

        await input.fill(newName);
        await renameDialog.getByRole("button", { name: "Salvar alterações" }).click();

        await expect(page.getByText(`"${name}" agora se chama "${newName}".`)).toBeVisible();
        await expect(page.locator(".transaction-row", { hasText: newName })).toBeVisible();
    });

    test("orçamento estourado aparece na categoria e no resumo do Dashboard", async ({ page }) => {
        const name = `Mercado ${uniqueLetters()}`;

        await page.getByRole("button", { name: "Nova categoria" }).click();
        const dialog = page.getByRole("dialog", { name: "Nova categoria" });
        await dialog.getByLabel("Nome da categoria").fill(name);
        await dialog.getByLabel("Orçamento mensal (opcional)").fill("10000");
        await expect(dialog.getByLabel("Orçamento mensal (opcional)")).toHaveValue(/R\$\s100,00/);
        await dialog.getByRole("button", { name: "Criar categoria" }).click();
        await expect(page.getByText(`Categoria "${name}" criada.`)).toBeVisible();

        runDjangoShell(
            "from django.utils import timezone; " +
            "from transactions.models import Category, Transaction; " +
            `c = Category.objects.get(user__username="${E2E_USER.username}", name="${name}"); ` +
            "Transaction.objects.create(user=c.user, category=c, description=\"Compra grande\", " +
            "amount=\"120.00\", type=\"EXPENSE\", date=timezone.localdate())"
        );

        await page.reload();
        const row = page.locator(".transaction-row", { hasText: name });
        await expect(row).toContainText(/R\$\s120,00 de R\$\s100,00/);
        await expect(row.getByText(/Passou R\$\s20,00/)).toBeVisible();

        await page.goto("/");
        await expect(page.locator(".insight-banner")).toContainText(
            new RegExp(`${name} passou do orçamento em R\\$\\s20,00`)
        );
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
