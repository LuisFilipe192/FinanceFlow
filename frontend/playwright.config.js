import { defineConfig, devices } from "@playwright/test";

import { PROJECT_ROOT, PYTHON } from "./e2e/support/django.js";

// Testes de ponta a ponta: um navegador de verdade usa o FinanceFlow como
// uma pessoa usaria. Rodar com: npm run test:e2e
export default defineConfig({
    testDir: "./e2e",

    // Os testes compartilham o mesmo usuário, então rodam um de cada vez.
    workers: 1,
    fullyParallel: false,

    timeout: 30_000,
    expect: { timeout: 7_000 },

    reporter: [["list"], ["html", { open: "never" }]],

    globalSetup: "./e2e/global-setup.js",
    globalTeardown: "./e2e/global-teardown.js",

    use: {
        baseURL: "http://localhost:5173",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        // Em caso de falha, guarda print e o passo a passo para investigar.
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
    },

    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],

    // Liga backend e frontend. Se você já deixou os dois rodando,
    // eles são reaproveitados.
    webServer: [
        {
            command: `"${PYTHON}" manage.py runserver 8000 --noreload`,
            cwd: PROJECT_ROOT,
            url: "http://localhost:8000/api/auth/session/",
            reuseExistingServer: true,
            timeout: 60_000,
        },
        {
            command: "npm run dev -- --port 5173 --strictPort",
            url: "http://localhost:5173",
            reuseExistingServer: true,
            timeout: 60_000,
        },
    ],
});
