import { Navigate, useLocation } from "react-router-dom";

import AuthStatusScreen from "./AuthStatusScreen";
import { useAuth } from "../../context/AuthContext";

// Envolve as rotas privadas. Sem sessão, manda para o login guardando a
// página pedida em state.from, para voltar até ela depois de entrar.
//
// Lembrete de segurança: isto só decide o que MOSTRAR. Quem protege os dados
// de verdade é o Django, que recusa qualquer requisição sem sessão válida.
function RequireAuth({ children }) {
    const { status, refreshSession } = useAuth();
    const location = useLocation();

    if (status === "loading" || status === "error") {
        return <AuthStatusScreen status={status} onRetry={refreshSession} />;
    }

    if (status === "anonymous") {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}

export default RequireAuth;
