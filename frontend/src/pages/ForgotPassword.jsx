import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, MailCheck, Send } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import { requestPasswordReset } from "../services/auth";
import { getEmailError } from "../utils/validation";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [fieldError, setFieldError] = useState("");
    const [error, setError] = useState("");
    const [sentMessage, setSentMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const trimmedEmail = email.trim();
        const validation = getEmailError(trimmedEmail);
        setFieldError(validation);

        if (validation) return;

        try {
            setLoading(true);
            setError("");

            const response = await requestPasswordReset(trimmedEmail);

            setSentMessage(response.detail);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout
            title="Esqueci minha senha"
            subtitle="Informe seu e-mail e enviamos um link para você escolher uma senha nova."
            footer={
                <>
                    Lembrou a senha? <Link to="/login">Voltar para o login</Link>
                </>
            }
        >
            {sentMessage ? (
                <div className="auth-notice" role="status">
                    <MailCheck size={18} />
                    <span>{sentMessage} O link vale por 1 hora. Confira também a caixa de spam.</span>
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
                        <label htmlFor="forgot-email">E-mail</label>
                        <input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            autoFocus
                            maxLength={254}
                            value={email}
                            className={fieldError ? "input-error" : ""}
                            aria-invalid={Boolean(fieldError)}
                            aria-describedby={fieldError ? "forgot-email-error" : undefined}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setFieldError("");
                                setError("");
                            }}
                        />
                        {fieldError && (
                            <span id="forgot-email-error" className="field-error">{fieldError}</span>
                        )}
                    </div>

                    <button type="submit" className="primary-button auth-submit" disabled={loading}>
                        {loading ? (
                            "Enviando..."
                        ) : (
                            <>
                                <Send size={18} />
                                Enviar link
                            </>
                        )}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}

export default ForgotPassword;
