import { RefreshCw, WifiOff } from "lucide-react";

import Brand from "../Brand";

// Tela cheia usada enquanto a sessão é verificada (loading) ou quando o
// servidor não respondeu (error). No loading, o conteúdo só aparece depois
// de um instante (CSS): se a resposta vier rápido, nada pisca na tela.
function AuthStatusScreen({ status, onRetry }) {
    if (status === "error") {
        return (
            <div className="auth-status-screen">
                <Brand />

                <div className="auth-status-error" role="alert">
                    <div className="empty-icon">
                        <WifiOff size={24} />
                    </div>

                    <h1>Não conseguimos falar com o servidor</h1>
                    <p>Verifique se o backend está rodando e se você está conectado.</p>

                    <button type="button" className="primary-button" onClick={onRetry}>
                        <RefreshCw size={16} />
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-status-screen" aria-busy="true">
            <div className="auth-status-loading">
                <Brand />
                <span className="auth-status-bar" />
                <span className="sr-only">Verificando sua sessão...</span>
            </div>
        </div>
    );
}

export default AuthStatusScreen;
