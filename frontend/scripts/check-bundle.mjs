import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const ALLOWED_ENV = new Set(["VITE_API_URL"]);
const SENSITIVE_NAME = /KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL/i;
const SECRET_PATTERNS = [
    /django-insecure-/,
    /DJANGO_SECRET_KEY/,
    /sk-ant-[\w-]{8,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function listFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? listFiles(path) : [path];
    });
}

const problems = [];

for (const file of listFiles("dist")) {
    const name = relative("dist", file);

    if (file.endsWith(".map")) {
        problems.push(`Source map publicado: ${name}`);
        continue;
    }

    const content = readFileSync(file, "latin1");

    if (content.includes("sourceMappingURL=")) {
        problems.push(`Referência a source map: ${name}`);
    }

    for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
            problems.push(`Possível segredo em ${name}: ${pattern}`);
        }
    }
}

for (const file of listFiles("src")) {
    const content = readFileSync(file, "utf-8");

    for (const [, name] of content.matchAll(/import\.meta\.env\.(VITE_\w+)/g)) {
        if (SENSITIVE_NAME.test(name)) {
            problems.push(`${name} em ${file}: variáveis VITE_ são públicas, chaves ficam no backend.`);
        } else if (!ALLOWED_ENV.has(name)) {
            problems.push(`${name} em ${file}: adicione à lista de variáveis públicas se for mesmo pública.`);
        }
    }
}

if (problems.length > 0) {
    console.error(`Bundle reprovado:\n- ${problems.join("\n- ")}`);
    process.exit(1);
}

console.log("Bundle aprovado: sem source maps, segredos ou variáveis sensíveis.");
