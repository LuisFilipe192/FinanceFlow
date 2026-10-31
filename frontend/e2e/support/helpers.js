import { expect } from "@playwright/test";

import { E2E_USER } from "./users.js";

// Entra pela tela de login, como uma pessoa faria.
export async function login(page, user = E2E_USER) {
    await page.goto("/login");
    await fillLogin(page, user);
    await expect(page).toHaveURL("/");
}

export async function fillLogin(page, { username, password }) {
    await page.getByLabel("Nome de usuário").fill(username);
    // exact: o botão "Mostrar senha" também contém a palavra "senha".
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

// Nomes de categoria só aceitam letras, então o sufixo único também.
export function uniqueLetters(length = 6) {
    return Array.from({ length }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26))
    ).join("");
}

// toLocaleString usa espaço não separável em "R$ 125,50"; \s cobre os dois.
export function money(text) {
    return new RegExp(text.replace("R$ ", "R\\$\\s"));
}
