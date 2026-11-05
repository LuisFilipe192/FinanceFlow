const USERNAME_PATTERN = /^[\w.@+-]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getUsernameError(username, emptyMessage = "Informe o nome de usuário.") {
    if (!username) return emptyMessage;
    if (!USERNAME_PATTERN.test(username)) return "Use letras, números e @ . + - _ (sem espaços).";
    return "";
}

// Regras que dá para conferir enquanto a pessoa digita. O Django ainda
// recusa senhas muito comuns ou parecidas com o usuário: essas mensagens
// chegam do servidor e aparecem abaixo do campo.
export function getPasswordRules(password, confirmation) {
    return [
        { label: "Pelo menos 8 caracteres", ok: password.length >= 8 },
        { label: "Não pode ser só números", ok: password !== "" && !/^\d+$/.test(password) },
        { label: "As duas senhas são iguais", ok: confirmation !== "" && confirmation === password },
    ];
}

export function getEmailError(email) {
    if (!email) return "Informe seu e-mail.";
    if (!EMAIL_PATTERN.test(email)) return "Informe um e-mail válido, como nome@exemplo.com.";
    return "";
}
