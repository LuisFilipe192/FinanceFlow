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
});
