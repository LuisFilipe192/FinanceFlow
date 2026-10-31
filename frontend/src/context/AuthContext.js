import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// Uso: const { user, status, login, register, logout } = useAuth();
//
// status:
//   "loading"        ainda perguntando ao Django se existe sessão
//   "authenticated"  há sessão; user = { id, username }
//   "anonymous"      não há sessão; user = null
//   "error"          não deu para perguntar (servidor fora do ar, sem internet)
export function useAuth() {
    const auth = useContext(AuthContext);

    if (!auth) {
        throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
    }

    return auth;
}
