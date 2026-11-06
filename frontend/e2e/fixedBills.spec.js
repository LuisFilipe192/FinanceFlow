import { expect, test } from "@playwright/test";

import { runDjangoShell } from "./support/django.js";
import { login, money, uniqueLetters } from "./support/helpers.js";
import { E2E_USER } from "./support/users.js";

function createBill(description, amount, dueDay = "None") {
    runDjangoShell(
        "from django.contrib.auth import get_user_model; " +
        "from transactions.models import Category, FixedBill; " +
        `user = get_user_model().objects.get(username="${E2E_USER.username}"); ` +
        "category, _ = Category.objects.get_or_create(user=user, name=\"Transferências\"); " +
        `FixedBill.objects.create(user=user, category=category, description="${description}", ` +
        `amount="${amount}", due_day=${dueDay})`
    );
}

test.describe("Contas fixas", () => {
    test("pagar registra a despesa, marca como paga e volta a pendente se excluir", async ({ page }) => {
        const description = `Internet ${uniqueLetters()}`;
        createBill(description, "99.90");

        await login(page);
        await page.goto("/transactions");

        const bill = page.locator(".fixed-bill", { hasText: description });
        await expect(bill).toContainText("Sem vencimento");

        await bill.getByRole("button", { name: `Pagar ${description}` }).click();

        const dialog = page.getByRole("dialog", { name: `Pagar ${description}` });
        await expect(dialog.getByLabel("Valor pago")).toHaveValue(money("R$ 99,90"));
        await dialog.getByLabel("Valor pago").fill("12000");
        await dialog.getByRole("button", { name: /Pagar R\$/ }).click();

        await expect(dialog).toBeHidden();
        await expect(bill).toContainText(/Paga em \d{2}\/\d{2}/);
        await expect(bill).toContainText(money("R$ 120,00"));
        await expect(bill.getByRole("button", { name: `Pagar ${description}` })).toHaveCount(0);

        const row = page.locator(".transaction-row", { hasText: description });
        await expect(row).toContainText("Conta fixa");

        await row.hover();
        await row.getByRole("button", { name: `Excluir ${description}` }).click();

        await expect(bill).toContainText("Sem vencimento", { timeout: 9_000 });
    });

    test("cadastra, edita e exclui uma conta sem apagar os pagamentos", async ({ page }) => {
        const description = `Aluguel ${uniqueLetters()}`;

        await login(page);
        await page.goto("/transactions");

        await page.getByRole("button", { name: "Nova conta" }).click();
        const createDialog = page.getByRole("dialog", { name: "Nova conta fixa" });

        await createDialog.getByRole("button", { name: "Cadastrar conta" }).click();
        await expect(createDialog.getByText("Informe o nome da conta.")).toBeVisible();
        await expect(createDialog.getByText("Informe o valor da conta.")).toBeVisible();

        await createDialog.getByLabel("Nome da conta").fill(description);
        await createDialog.getByLabel("Valor").fill("180000");
        await createDialog.getByLabel("Dia do vencimento (opcional)").fill("40");
        await createDialog.getByRole("button", { name: "Cadastrar conta" }).click();
        await expect(createDialog.getByText("Use um dia entre 1 e 31.")).toBeVisible();

        await createDialog.getByLabel("Dia do vencimento (opcional)").fill("");
        await createDialog.getByRole("button", { name: "Cadastrar conta" }).click();
        await expect(page.getByText(`Conta "${description}" cadastrada.`)).toBeVisible();

        const bill = page.locator(".fixed-bill", { hasText: description });
        await expect(bill).toContainText(money("R$ 1.800,00"));

        await bill.hover();
        await bill.getByRole("button", { name: `Editar conta ${description}` }).click();
        const editDialog = page.getByRole("dialog", { name: "Editar conta fixa" });
        await expect(editDialog.getByLabel("Nome da conta")).toHaveValue(description);
        await editDialog.getByLabel("Valor").fill("190000");
        await editDialog.getByRole("button", { name: "Salvar alterações" }).click();
        await expect(bill).toContainText(money("R$ 1.900,00"));

        await bill.getByRole("button", { name: `Pagar ${description}` }).click();
        const payDialog = page.getByRole("dialog", { name: `Pagar ${description}` });
        await payDialog.getByRole("button", { name: /Pagar R\$/ }).click();
        await expect(bill).toContainText(/Paga em/);

        await bill.hover();
        await bill.getByRole("button", { name: `Excluir conta ${description}` }).click();
        await page.getByRole("dialog", { name: "Excluir conta fixa?" })
            .getByRole("button", { name: "Excluir conta" })
            .click();

        await expect(page.getByText(`Conta "${description}" excluída.`)).toBeVisible();
        await expect(bill).toHaveCount(0);
        await expect(page.locator(".transaction-row", { hasText: description })).toBeVisible();
    });
});
