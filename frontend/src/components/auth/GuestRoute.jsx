import { Navigate, useLocation } from "react-router-dom";

import AuthStatusScreen from "./AuthStatusScreen";
import { useAuth } from "../../context/AuthContext";
import { getRedirectTarget } from "../../utils/authRedirect";

// Envolve as telas de login e cadastro: quem já está logado não precisa
// delas e vai direto para o app (ou para a página que tinha pedido).
function GuestRoute({ children }) {
    const { status } = useAuth();
    const location = useLocation();

    if (status === "loading") {
        return <AuthStatusScreen status="loading" />;
    }

    if (status === "authenticated") {
        return <Navigate to={getRedirectTarget(location)} replace />;
    }

    // "anonymous" e também "error": a tela de login abre e, se o servidor
    // continuar fora do ar, o próprio formulário mostra o erro de conexão.
    return children;
}

export default GuestRoute;
