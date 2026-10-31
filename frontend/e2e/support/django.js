import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Raiz do projeto Django (onde fica o manage.py).
export const PROJECT_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../.."
);

// Python do ambiente virtual. Em outro sistema, defina E2E_PYTHON.
export const PYTHON =
    process.env.E2E_PYTHON ?? path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe");

// Roda um trecho de Python dentro do Django (manage.py shell -c).
export function runDjangoShell(code) {
    return execFileSync(PYTHON, ["manage.py", "shell", "-c", code], {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
    });
}
