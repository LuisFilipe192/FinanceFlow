import { expect, test } from "@playwright/test";

import { fillLogin, login, uniqueLetters } from "./support/helpers.js";
import { runDjangoShell } from "./support/django.js";
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

test.describe("Recuperação de senha", () => {
    function createUserWithResetLink() {
        const username = `${E2E_PREFIX}reset_${uniqueLetters()}`;
        const password = "Antiga!Senha-2026";

        const output = runDjangoShell(
            "from django.contrib.auth import get_user_model; " +
            "from transactions.services.password_reset import build_reset_link; " +
            `user = get_user_model().objects.create_user(username="${username}", ` +
            `email="${username}@example.com", password="${password}"); ` +
            "print(build_reset_link(user))"
        );
        const link = output.split(/\s+/).find((part) => part.includes("/reset-password#"));

        return { username, password, path: link.slice(link.indexOf("/reset-password")) };
    }

    test("pedir o link mostra a mesma resposta para qualquer e-mail", async ({ page }) => {
        await page.goto("/login");
        await page.getByRole("link", { name: "Esqueci minha senha" }).click();
        await expect(page).toHaveURL("/forgot-password");

        await page.getByRole("button", { name: "Enviar link" }).click();
        await expect(page.getByText("Informe seu e-mail.")).toBeVisible();

        await page.getByLabel("E-mail").fill(`${E2E_PREFIX}ninguem@example.com`);
        await page.getByRole("button", { name: "Enviar link" }).click();

        await expect(page.getByRole("status")).toContainText(
            "Se existir uma conta com esse e-mail, enviamos um link"
        );
    });

    test("o link troca a senha, some da barra de endereços e não funciona de novo", async ({ page }) => {
        const user = createUserWithResetLink();
        const newPassword = "Nova!Senha-Forte-2026";

        await page.goto(user.path);
        await expect(page).toHaveURL("/reset-password");
        expect(page.url()).not.toContain("token");

        await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
        await page.getByLabel("Confirme a nova senha").fill(newPassword);
        await page.getByRole("button", { name: "Salvar nova senha" }).click();

        await expect(page).toHaveURL("/login");
        await expect(page.getByText("Senha redefinida. Entre com a senha nova.")).toBeVisible();

        await fillLogin(page, { username: user.username, password: newPassword });
        await expect(page).toHaveURL("/");

        await page.getByRole("button", { name: `Conta de ${user.username}` }).click();
        await page.getByRole("menuitem", { name: "Sair" }).click();
        await expect(page).toHaveURL("/login");

        await page.goto(user.path);
        await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
        await page.getByLabel("Confirme a nova senha").fill(newPassword);
        await page.getByRole("button", { name: "Salvar nova senha" }).click();

        await expect(page.getByRole("alert")).toHaveText("Este link é inválido ou expirou. Peça um novo.");
        await expect(page.getByRole("link", { name: "Pedir um novo link" })).toBeVisible();
    });

    test("link incompleto pede um novo sem mostrar o formulário", async ({ page }) => {
        await page.goto("/reset-password");

        await expect(page.getByRole("alert")).toHaveText("Este link é inválido ou expirou. Peça um novo.");
        await expect(page.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
    });
});

