import { expect, test } from "@playwright/test";

import { login } from "./support/helpers.js";

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

test.describe("Dashboard", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test("mostra saudação e resumo do mês", async ({ page }) => {
        const banner = page.locator(".insight-banner");

        await expect(banner).toBeVisible();
        await expect(banner).toContainText(/Bom dia!|Boa tarde!|Boa noite!/);
    });

    test("setas trocam o mês e o botão volta para o mês atual", async ({ page }) => {
        const today = new Date();
        const currentMonth = MONTHS[today.getMonth()];
        const previousMonth = MONTHS[(today.getMonth() + 11) % 12];
        const label = page.locator(".period-label");

        await expect(label).toContainText(currentMonth);
        await expect(page.getByText("Mês atual", { exact: true })).toBeVisible();

        await page.getByRole("button", { name: "Mês anterior" }).click();
        await expect(label).toContainText(previousMonth);

        await page.getByRole("button", { name: "Voltar para mês atual" }).click();
        await expect(label).toContainText(currentMonth);
        await expect(page.getByText("Mês atual", { exact: true })).toBeVisible();
    });
});
