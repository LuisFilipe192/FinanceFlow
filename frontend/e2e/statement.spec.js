import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createExpense, login } from "./support/helpers.js";

test.describe("Extrato", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test("mostra o período e baixa o CSV com a transação", async ({ page }) => {
        const description = `Extrato e2e ${Date.now()}`;

        await page.goto("/transactions");
        await createExpense(page, description);

        await page.getByRole("link", { name: "Extrato" }).click();
        await expect(page).toHaveURL("/statement");
        await expect(page.getByRole("cell", { name: description })).toBeVisible();

        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Baixar CSV" }).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/^extrato_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);

        const content = await readFile(await download.path(), "utf-8");
        expect(content).toContain("Data;Descrição;Categoria;Tipo;Valor;Parcela");
        expect(content).toContain(`${description};`);
    });

    test("período sem transações desliga a exportação", async ({ page }) => {
        await page.goto("/statement");

        await page.getByRole("textbox", { name: "De", exact: true }).fill("01/01/2001");
        await page.getByRole("textbox", { name: "Até", exact: true }).fill("31/01/2001");
        await page.keyboard.press("Escape");

        await expect(page.getByRole("heading", { name: "Nada neste período" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Baixar CSV" })).toBeDisabled();
    });

    test("data inicial depois da final mostra o aviso", async ({ page }) => {
        await page.goto("/statement");

        await page.getByRole("textbox", { name: "De", exact: true }).fill("31/12/2030");
        await page.keyboard.press("Escape");

        await expect(page.getByRole("heading", { name: "Confira as datas" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Baixar CSV" })).toBeDisabled();
    });
});
