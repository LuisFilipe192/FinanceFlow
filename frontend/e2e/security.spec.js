import { expect, test } from "@playwright/test";

import { login } from "./support/helpers.js";

test.describe("Dados no navegador", () => {
    test("nada sensível fica guardado e o cookie de sessão é inacessível ao JavaScript", async ({ page, context }) => {
        await login(page);

        for (const path of ["/transactions", "/categories", "/settings", "/"]) {
            await page.goto(path);
            await page.waitForLoadState("networkidle");
        }

        const storage = await page.evaluate(async () => ({
            local: Object.keys(localStorage),
            session: Object.keys(sessionStorage),
            databases: (await indexedDB.databases()).map((database) => database.name),
            readableCookies: document.cookie.split("; ").map((cookie) => cookie.split("=")[0]),
        }));

        expect(storage.local).toEqual([]);
        expect(storage.session).toEqual([]);
        expect(storage.databases).toEqual([]);
        expect(storage.readableCookies).toEqual(["csrftoken"]);

        const cookies = await context.cookies();
        const session = cookies.find((cookie) => cookie.name === "sessionid");

        expect(cookies.map((cookie) => cookie.name).sort()).toEqual(["csrftoken", "sessionid"]);
        expect(session.httpOnly).toBe(true);
        expect(session.sameSite).toBe("Lax");
    });
});
