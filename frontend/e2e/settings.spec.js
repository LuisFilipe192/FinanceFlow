import { expect, test } from "@playwright/test";

import { fillLogin, login, uniqueLetters } from "./support/helpers.js";
import { runDjangoShell } from "./support/django.js";
import { E2E_PREFIX } from "./support/users.js";

const PASSWORD = "Perfil!E2E-2026";

function createUser(email = "") {
    const user = { username: `${E2E_PREFIX}perfil_${uniqueLetters()}`, password: PASSWORD };

    runDjangoShell(
        "from django.contrib.auth import get_user_model; " +
        "get_user_model().objects.create_user(" +
        `username="${user.username}", email="${email}", password="${PASSWORD}")`
    );

    return user;
}

function profilePassword(page) {
    return page.locator("#profile-password");
}

test.describe("Configurações", () => {
    test("trocar a senha encerra as outras sessões e a nova senha passa a valer", async ({ page, browser }) => {
        const user = createUser();
        const newPassword = "Nova!Senha-2026";

        const otherDevice = await browser.newPage();
        await login(otherDevice, user);

        await login(page, user);
        await page.goto("/settings");

        const changeButton = page.getByRole("button", { name: "Alterar senha" });
        await expect(changeButton).toBeDisabled();

        await page.locator("#password-current").fill("senha-errada");
        await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
        await page.getByLabel("Confirme a nova senha").fill(newPassword);
        await changeButton.click();
        await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

        await page.locator("#password-current").fill(PASSWORD);
        await changeButton.click();
        await expect(page.getByText("Senha alterada. As outras sessões abertas foram encerradas.")).toBeVisible();

        await page.reload();
        await expect(page).toHaveURL("/settings");

        await otherDevice.goto("/transactions");
        await expect(otherDevice).toHaveURL("/login");
        await fillLogin(otherDevice, { username: user.username, password: newPassword });
        await expect(otherDevice).toHaveURL("/transactions");
        await otherDevice.close();
    });

    test("conta sem e-mail vê o aviso e cadastra um, confirmando a senha", async ({ page }) => {
        const user = createUser();
        const email = `${user.username}@example.com`;

        await login(page, user);
        await page.getByRole("link", { name: "Configurações" }).click();

        await expect(page.getByText("Sua conta ainda não tem e-mail.")).toBeVisible();
        const save = page.getByRole("button", { name: "Salvar alterações" });
        await expect(save).toBeDisabled();

        await page.getByLabel("E-mail").fill(email);
        await save.click();
        await expect(page.getByText("Confirme sua senha para alterar o e-mail.")).toBeVisible();

        await profilePassword(page).fill("senha-errada");
        await save.click();
        await expect(page.getByText("Senha incorreta.")).toBeVisible();

        await profilePassword(page).fill(PASSWORD);
        await save.click();

        await expect(page.getByText("Perfil atualizado.")).toBeVisible();
        await expect(page.getByText("Sua conta ainda não tem e-mail.")).toBeHidden();
        await expect(profilePassword(page)).toBeHidden();

        await page.getByRole("button", { name: `Conta de ${user.username}` }).click();
        await page.getByRole("menuitem", { name: "Sair" }).click();
        await expect(page).toHaveURL("/login");

        await fillLogin(page, { username: email, password: PASSWORD });
        await expect(page).toHaveURL("/");
    });

    test("trocar o nome de usuário atualiza o menu sem pedir senha", async ({ page }) => {
        const user = createUser(`${E2E_PREFIX}${uniqueLetters()}@example.com`);
        const newUsername = `${E2E_PREFIX}novo_${uniqueLetters()}`;

        await login(page, user);
        await page.goto("/settings");

        await page.getByLabel("Nome de usuário").fill(newUsername);
        await expect(profilePassword(page)).toBeHidden();
        await page.getByRole("button", { name: "Salvar alterações" }).click();

        await expect(page.getByText("Perfil atualizado.")).toBeVisible();
        await expect(page.getByRole("button", { name: `Conta de ${newUsername}` })).toBeVisible();
    });

    test("excluir a conta pede a senha e volta para o login", async ({ page }) => {
        const user = createUser();

        await login(page, user);
        await page.goto("/settings");

        await page.getByRole("button", { name: "Excluir conta" }).click();
        const dialog = page.getByRole("dialog", { name: "Excluir conta?" });
        await expect(dialog).toContainText(/Serão apagadas para sempre 0 transações e \d+ categoria/);

        await dialog.getByLabel("Confirme sua senha para continuar").fill(PASSWORD);
        await dialog.getByRole("button", { name: "Excluir minha conta" }).click();

        await expect(page).toHaveURL("/login");
        await expect(page.getByText(`A conta ${user.username} foi excluída.`)).toBeVisible();

        await fillLogin(page, user);
        await expect(page.getByRole("alert")).toHaveText("Usuário ou senha inválidos.");
    });
});
