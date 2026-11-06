import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Circle, KeyRound } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { confirmPasswordReset } from "../services/auth";
import { getPasswordRules } from "../utils/validation";

function readResetParams(hash) {
    const params = new URLSearchParams(hash.replace(/^#/, ""));

    return { uid: params.get("uid") ?? "", token: params.get("token") ?? "" };
}

function ResetPassword() {
    const { refreshSession } = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [{ uid, token }] = useState(() => readResetParams(location.hash));
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [linkError, setLinkError] = useState(uid && token ? "" : "Este link é inválido ou expirou. Peça um novo.");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        window.history.replaceState(null, "", window.location.pathname);
    }, []);

    const rules = getPasswordRules(password, confirmation);

    const clientErrors = {
        password: !rules[0].ok || !rules[1].ok ? "A senha ainda não atende às regras abaixo." : "",
        confirmation: !confirmation
            ? "Repita a nova senha."
            : !rules[2].ok
                ? "As senhas não coincidem."
                : "",
    };

    function getError(field) {
        return serverErrors[field] || (submitted ? clientErrors[field] : "");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitted(true);

        if (Object.values(clientErrors).some(Boolean)) return;

        try {
            setLoading(true);
            setError("");
            setServerErrors({});

            await confirmPasswordReset({ uid, token, password, confirmation });
            await refreshSession();

            showToast({ type: "success", message: "Senha redefinida. Entre com a senha nova." });
            navigate("/login", { replace: true });
        } catch (requestError) {
            const fieldErrors = requestError.data?.errors;

            setLoading(false);

            if (fieldErrors) {
                setServerErrors({
                    password: fieldErrors.new_password?.join(" ") || "",
                    confirmation: fieldErrors.new_password_confirmation?.join(" ") || "",
                });
            } else if (requestError.status === 400) {
                setLinkError(requestError.message);
            } else {
                setError(requestError.message);
            }
        }
    }

    const passwordError = getError("password");
    const confirmationError = getError("confirmation");

    return (
        <AuthLayout
            title="Nova senha"
            subtitle="Escolha uma senha que você não usa em outros sites."
            footer={<Link to="/login">Voltar para o login</Link>}
        >
            {linkError ? (
                <div className="auth-form">
                    <div className="auth-alert" role="alert">
                        <AlertCircle size={18} />
                        <span>{linkError}</span>
                    </div>

                    <Link to="/forgot-password" className="primary-button auth-submit">
                        Pedir um novo link
                    </Link>
                </div>
            ) : (
                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {error && (
                        <div className="auth-alert" role="alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="auth-field">
                        <label htmlFor="reset-password">Nova senha</label>
                        <PasswordInput
                            id="reset-password"
                            autoComplete="new-password"
                            value={password}
                            invalid={Boolean(passwordError)}
                            describedBy="reset-password-rules"
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setServerErrors((previous) => ({ ...previous, password: "" }));
                            }}
                        />
                        {passwordError && <span className="field-error">{passwordError}</span>}
                    </div>

                    <div className="auth-field">
                        <label htmlFor="reset-confirmation">Confirme a nova senha</label>
                        <PasswordInput
                            id="reset-confirmation"
                            autoComplete="new-password"
                            value={confirmation}
                            invalid={Boolean(confirmationError)}
                            describedBy={confirmationError ? "reset-confirmation-error" : undefined}
                            onChange={(event) => {
                                setConfirmation(event.target.value);
                                setServerErrors((previous) => ({ ...previous, confirmation: "" }));
                            }}
                        />
                        {confirmationError && (
                            <span id="reset-confirmation-error" className="field-error">{confirmationError}</span>
                        )}
                    </div>

                    <ul className="password-rules" id="reset-password-rules" aria-live="polite">
                        {rules.map((rule) => (
                            <li key={rule.label} className={rule.ok ? "ok" : ""}>
                                {rule.ok ? <Check size={14} /> : <Circle size={14} />}
                                {rule.label}
                            </li>
                        ))}
                    </ul>

                    <button type="submit" className="primary-button auth-submit" disabled={loading}>
                        {loading ? (
                            "Salvando..."
                        ) : (
                            <>
                                <KeyRound size={18} />
                                Salvar nova senha
                            </>
                        )}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}

export default ResetPassword;
