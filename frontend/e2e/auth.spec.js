import { expect, test } from "@playwright/test";

import { fillLogin, login, uniqueLetters } from "./support/helpers.js";
import { E2E_PREFIX, E2E_USER } from "./support/users.js";

test.describe("Login", () => {
    test("página privada leva ao login e, depois de entrar, volta para ela", async ({ page }) => {
        await page.goto("/transactions");

        await expect(page).toHaveURL("/login");

        await fillLogin(page, E2E_USER);

        await expect(page).toHaveURL("/transactions");
        await expect(page.getByRole("heading", { name: "Histórico de transações" })).toBeVisible();
        await expect(page.getByText(`Bem-vindo de volta, ${E2E_USER.username}!`)).toBeVisible();
    });

    test("usuário inexistente mostra erro genérico e limpa a senha", async ({ page }) => {
        await page.goto("/login");

        await fillLogin(page, { username: "e2e_nao_existe", password: "qualquercoisa" });

        await expect(page.getByRole("alert")).toHaveText("Usuário ou senha inválidos.");
        await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
        await expect(page.getByLabel("Usuário ou e-mail")).toHaveValue("e2e_nao_existe");
        await expect(page).toHaveURL("/login");
    });

    test("senha errada mostra a mesma mensagem de usuário inexistente", async ({ page }) => {
        await page.goto("/login");

        await fillLogin(page, { username: E2E_USER.username, password: "senha-errada" });

        await expect(page.getByRole("alert")).toHaveText("Usuário ou senha inválidos.");
    });

    test("muitas tentativas mostram o aviso de espera", async ({ page }) => {
        await page.route("**/api/auth/login/", (route) => route.fulfill({
            status: 429,
            contentType: "application/json",
            headers: { "Retry-After": "600" },
            body: JSON.stringify({ detail: "Too many requests." }),
        }));
        await page.goto("/login");

        await fillLogin(page, E2E_USER);

        await expect(page.getByRole("alert")).toHaveText(
            "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        );
        await expect(page).toHaveURL("/login");
    });

    test("campos vazios mostram o que falta", async ({ page }) => {
        await page.goto("/login");

        await page.getByRole("button", { name: "Entrar", exact: true }).click();

        await expect(page.getByText("Informe seu usuário ou e-mail.")).toBeVisible();
        await expect(page.getByText("Informe sua senha.")).toBeVisible();
    });

    test("quem já está logado não vê a tela de login", async ({ page }) => {
        await login(page);

        await page.goto("/login");

        await expect(page).toHaveURL("/");
    });

    test("mostrar senha troca o campo para texto", async ({ page }) => {
        await page.goto("/login");
        const password = page.getByLabel("Senha", { exact: true });

        await password.fill("segredo");
        await expect(password).toHaveAttribute("type", "password");

        await page.getByRole("button", { name: "Mostrar senha" }).click();
        await expect(password).toHaveAttribute("type", "text");
    });
});

test.describe("Cadastro", () => {
    test("regras da senha são marcadas enquanto digita e a conta é criada", async ({ page }) => {
        const username = `${E2E_PREFIX}novo_${uniqueLetters()}`;
        const rule = (text) => page.locator(".password-rules li", { hasText: text });

        await page.goto("/register");
        await page.getByLabel("Nome de usuário").fill(username);
        await page.getByLabel("E-mail").fill(`${username}@example.com`);

        await page.getByLabel("Senha", { exact: true }).fill("12345678");
        await expect(rule("Pelo menos 8 caracteres")).toHaveClass(/ok/);
        await expect(rule("Não pode ser só números")).not.toHaveClass(/ok/);

        await page.getByLabel("Senha", { exact: true }).fill("Carteira!Verde42");
        await page.getByLabel("Confirme a senha").fill("Carteira!Verde42");
        await expect(rule("Não pode ser só números")).toHaveClass(/ok/);
        await expect(rule("As duas senhas são iguais")).toHaveClass(/ok/);

        await page.getByRole("button", { name: "Criar conta" }).click();

        await expect(page).toHaveURL("/");
        await expect(page.getByText(`Conta criada! Bem-vindo ao FinanceFlow, ${username}.`)).toBeVisible();
    });

    test("nome de usuário já usado mostra o erro do servidor no campo", async ({ page }) => {
        await page.goto("/register");

        await page.getByLabel("Nome de usuário").fill(E2E_USER.username);
        await page.getByLabel("E-mail").fill(`${E2E_PREFIX}${uniqueLetters()}@example.com`);
        await page.getByLabel("Senha", { exact: true }).fill("Carteira!Verde42");
        await page.getByLabel("Confirme a senha").fill("Carteira!Verde42");
        await page.getByRole("button", { name: "Criar conta" }).click();

        await expect(page.getByText("Este nome de usuário não está disponível.")).toBeVisible();
        await expect(page).toHaveURL("/register");
    });

    test("e-mail vazio ou inválido é apontado antes de enviar", async ({ page }) => {
        await page.goto("/register");

        await page.getByRole("button", { name: "Criar conta" }).click();
        await expect(page.getByText("Informe seu e-mail.")).toBeVisible();

        await page.getByLabel("E-mail").fill("sem-arroba");
        await expect(page.getByText("Informe um e-mail válido, como nome@exemplo.com.")).toBeVisible();
    });
});
