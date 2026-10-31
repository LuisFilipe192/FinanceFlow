// Para onde ir depois de entrar: a página que a pessoa tentou abrir antes
// de ser mandada para o login (guardada pelo RequireAuth), ou o Dashboard.
export function getRedirectTarget(location) {
    const from = location.state?.from;

    if (!from || from.pathname === "/login" || from.pathname === "/register") {
        return "/";
    }

    return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}
