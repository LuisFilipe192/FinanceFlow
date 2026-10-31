import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function Login() {
    const { login } = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    // Erros de campo só aparecem depois da primeira tentativa de entrar.
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const fieldErrors = {
        username: username.trim() ? "" : "Informe seu nome de usuário.",
        password: password ? "" : "Informe sua senha.",
    };
    const showUsernameError = submitted && fieldErrors.username;
    const showPasswordError = submitted && fieldErrors.password;

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitted(true);

        if (fieldErrors.username || fieldErrors.password) return;

        try {
            setLoading(true);
            setError("");

            const user = await login({ username: username.trim(), password });

            showToast({ type: "success", message: `Bem-vindo de volta, ${user.username}!` });
            navigate("/", { replace: true });
        } catch (loginError) {
            // O Django responde a mesma mensagem para usuário inexistente e
            // senha errada: assim ninguém descobre quais usuários existem.
            setError(loginError.message);
            setPassword("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Entrar"
            subtitle="Que bom te ver de novo. Entre para ver suas finanças."
            footer={
                <>
                    Ainda não tem conta? <Link to="/register">Criar conta</Link>
                </>
            }
        >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {error && (
                    <div className="auth-alert" role="alert">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="auth-field">
                    <label htmlFor="login-username">Nome de usuário</label>
                    <input
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        value={username}
                        className={showUsernameError ? "input-error" : ""}
                        aria-invalid={Boolean(showUsernameError)}
                        aria-describedby={showUsernameError ? "login-username-error" : undefined}
                        onChange={(event) => {
                            setUsername(event.target.value);
                            setError("");
                        }}
                    />
                    {showUsernameError && (
                        <span id="login-username-error" className="field-error">
                            {fieldErrors.username}
                        </span>
                    )}
                </div>

                <div className="auth-field">
                    <label htmlFor="login-password">Senha</label>
                    <PasswordInput
                        id="login-password"
                        autoComplete="current-password"
                        value={password}
                        invalid={Boolean(showPasswordError)}
                        describedBy={showPasswordError ? "login-password-error" : undefined}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            setError("");
                        }}
                    />
                    {showPasswordError && (
                        <span id="login-password-error" className="field-error">
                            {fieldErrors.password}
                        </span>
                    )}
                </div>

                <button type="submit" className="primary-button auth-submit" disabled={loading}>
                    {loading ? (
                        "Entrando..."
                    ) : (
                        <>
                            <LogIn size={18} />
                            Entrar
                        </>
                    )}
                </button>
            </form>
        </AuthLayout>
    );
}

export default Login;
