import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Circle, UserPlus } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getRedirectTarget } from "../utils/authRedirect";
import { getEmailError, getPasswordRules, getUsernameError } from "../utils/validation";

function Register() {
    const { register } = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [submitted, setSubmitted] = useState(false);
    // Erros vindos do Django, por campo: { username: "...", password: "..." }.
    const [serverErrors, setServerErrors] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const rules = getPasswordRules(password, confirmation);
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const clientErrors = {
        username: getUsernameError(trimmedUsername, "Escolha um nome de usuário."),
        email: getEmailError(trimmedEmail),
        password: !rules[0].ok || !rules[1].ok ? "A senha ainda não atende às regras abaixo." : "",
        confirmation: !confirmation
            ? "Repita a senha."
            : !rules[2].ok
                ? "As senhas não coincidem."
                : "",
    };

    function getError(field) {
        return serverErrors[field] || (submitted ? clientErrors[field] : "");
    }

    function clearServerError(field) {
        setServerErrors((previous) => ({ ...previous, [field]: "" }));
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitted(true);

        if (Object.values(clientErrors).some(Boolean)) return;

        try {
            setLoading(true);
            setError("");
            setServerErrors({});

            const user = await register({
                username: trimmedUsername,
                email: trimmedEmail,
                password,
                passwordConfirmation: confirmation,
            });

            showToast({
                type: "success",
                message: `Conta criada! Bem-vindo ao FinanceFlow, ${user.username}.`,
            });
            navigate(getRedirectTarget(location), { replace: true });
        } catch (registerError) {
            const fieldErrors = registerError.data?.errors;

            if (fieldErrors) {
                setServerErrors({
                    username: fieldErrors.username?.join(" ") || "",
                    email: fieldErrors.email?.join(" ") || "",
                    password: fieldErrors.password?.join(" ") || "",
                    confirmation: fieldErrors.password_confirmation?.join(" ") || "",
                });
            } else {
                setError(registerError.message);
            }
        } finally {
            setLoading(false);
        }
    }

    const usernameError = getError("username");
    const emailError = getError("email");
    const passwordError = getError("password");
    const confirmationError = getError("confirmation");

    return (
        <AuthLayout
            title="Criar conta"
            subtitle="Leva menos de um minuto. Depois é só começar a registrar."
            footer={
                <>
                    Já tem conta?{" "}
                    <Link to="/login" state={location.state}>Entrar</Link>
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
                    <label htmlFor="register-username">Nome de usuário</label>
                    <input
                        id="register-username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        autoFocus
                        maxLength={150}
                        value={username}
                        className={usernameError ? "input-error" : ""}
                        aria-invalid={Boolean(usernameError)}
                        aria-describedby="register-username-help"
                        onChange={(event) => {
                            setUsername(event.target.value);
                            clearServerError("username");
                        }}
                    />
                    <span id="register-username-help" className={usernameError ? "field-error" : "field-hint"}>
                        {usernameError || "Letras, números e @ . + - _"}
                    </span>
                </div>

                <div className="auth-field">
                    <label htmlFor="register-email">E-mail</label>
                    <input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={254}
                        value={email}
                        className={emailError ? "input-error" : ""}
                        aria-invalid={Boolean(emailError)}
                        aria-describedby="register-email-help"
                        onChange={(event) => {
                            setEmail(event.target.value);
                            clearServerError("email");
                        }}
                    />
                    <span id="register-email-help" className={emailError ? "field-error" : "field-hint"}>
                        {emailError || "Você pode entrar com ele ou com o nome de usuário."}
                    </span>
                </div>

                <div className="auth-field">
                    <label htmlFor="register-password">Senha</label>
                    <PasswordInput
                        id="register-password"
                        autoComplete="new-password"
                        value={password}
                        invalid={Boolean(passwordError)}
                        describedBy="register-password-rules"
                        onChange={(event) => {
                            setPassword(event.target.value);
                            clearServerError("password");
                        }}
                    />
                    {passwordError && <span className="field-error">{passwordError}</span>}
                </div>

                <div className="auth-field">
                    <label htmlFor="register-confirmation">Confirme a senha</label>
                    <PasswordInput
                        id="register-confirmation"
                        autoComplete="new-password"
                        value={confirmation}
                        invalid={Boolean(confirmationError)}
                        describedBy={confirmationError ? "register-confirmation-error" : undefined}
                        onChange={(event) => {
                            setConfirmation(event.target.value);
                            clearServerError("confirmation");
                        }}
                    />
                    {confirmationError && (
                        <span id="register-confirmation-error" className="field-error">
                            {confirmationError}
                        </span>
                    )}
                </div>

                {/* As regras ficam visíveis o tempo todo e vão sendo marcadas
                    enquanto a pessoa digita, em vez de só reclamar no final. */}
                <ul className="password-rules" id="register-password-rules" aria-live="polite">
                    {rules.map((rule) => (
                        <li key={rule.label} className={rule.ok ? "ok" : ""}>
                            {rule.ok ? <Check size={14} /> : <Circle size={14} />}
                            {rule.label}
                        </li>
                    ))}
                </ul>

                <button type="submit" className="primary-button auth-submit" disabled={loading}>
                    {loading ? (
                        "Criando sua conta..."
                    ) : (
                        <>
                            <UserPlus size={18} />
                            Criar conta
                        </>
                    )}
                </button>
            </form>
        </AuthLayout>
    );
}

export default Register;
