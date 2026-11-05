const USERNAME_PATTERN = /^[\w.@+-]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getUsernameError(username, emptyMessage = "Informe o nome de usuário.") {
    if (!username) return emptyMessage;
    if (!USERNAME_PATTERN.test(username)) return "Use letras, números e @ . + - _ (sem espaços).";
    return "";
}

export function getEmailError(email) {
    if (!email) return "Informe seu e-mail.";
    if (!EMAIL_PATTERN.test(email)) return "Informe um e-mail válido, como nome@exemplo.com.";
    return "";
}
