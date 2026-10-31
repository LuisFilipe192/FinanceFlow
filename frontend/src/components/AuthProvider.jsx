import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthContext } from "../context/AuthContext";
import {
    getSession,
    login as loginRequest,
    register as registerRequest,
    logout as logoutRequest,
} from "../services/auth";
import { SESSION_CHECK_EVENT } from "../services/api";

// Guarda quem está logado e oferece login, cadastro e logout para o app todo.
// A fonte da verdade é a sessão do Django: ao abrir (ou recarregar) a página,
// o React pergunta ao servidor em vez de confiar em algo salvo no navegador.
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState("loading");

    const applySession = useCallback((session) => {
        setUser(session.authenticated ? session.user : null);
        setStatus(session.authenticated ? "authenticated" : "anonymous");
    }, []);

    const applySessionError = useCallback((error) => {
        console.error("Erro ao verificar a sessão:", error);
        setUser(null);
        setStatus("error");
    }, []);

    // Pergunta de novo ao Django (ex.: botão "Tentar novamente" na tela de erro).
    const refreshSession = useCallback(async () => {
        setStatus("loading");

        try {
            applySession(await getSession());
        } catch (error) {
            applySessionError(error);
        }
    }, [applySession, applySessionError]);

    useEffect(() => {
        // "active" ignora a resposta se o componente já tiver sido desmontado.
        let active = true;

        getSession()
            .then((session) => active && applySession(session))
            .catch((error) => active && applySessionError(error));

        return () => {
            active = false;
        };
    }, [applySession, applySessionError]);

    // Sessão expirada no meio do uso: o api.js dispara o evento ao receber
    // 401/403. A conferência é silenciosa (sem tela de carregamento); se a
    // sessão acabou mesmo, o status vira "anonymous" e o RequireAuth leva
    // para o login, guardando a página atual.
    useEffect(() => {
        function handleSessionCheck() {
            getSession()
                .then(applySession)
                .catch((error) => console.error("Erro ao conferir a sessão:", error));
        }

        window.addEventListener(SESSION_CHECK_EVENT, handleSessionCheck);

        return () => {
            window.removeEventListener(SESSION_CHECK_EVENT, handleSessionCheck);
        };
    }, [applySession]);

    const login = useCallback(async (credentials) => {
        const data = await loginRequest(credentials);

        setUser(data.user);
        setStatus("authenticated");

        return data.user;
    }, []);

    const register = useCallback(async (fields) => {
        const data = await registerRequest(fields);

        setUser(data.user);
        setStatus("authenticated");

        return data.user;
    }, []);

    const logout = useCallback(async () => {
        await logoutRequest();

        setUser(null);
        setStatus("anonymous");
    }, []);

    // useMemo: o objeto só muda quando user ou status mudam. Sem isso, todo
    // componente que usa useAuth renderizaria de novo a cada render daqui.
    const value = useMemo(
        () => ({ user, status, login, register, logout, refreshSession }),
        [user, status, login, register, logout, refreshSession]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
