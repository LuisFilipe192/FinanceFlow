import { useState } from "react";
import { MailWarning, Save } from "lucide-react";

import PasswordInput from "../auth/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getEmailError, getUsernameError } from "../../utils/validation";

function ProfileForm() {
    const { user, updateProfile } = useAuth();
    const showToast = useToast();

    const [username, setUsername] = useState(user.username);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const usernameChanged = trimmedUsername !== user.username;
    const emailChanged = trimmedEmail !== user.email;
    const dirty = usernameChanged || emailChanged;

    const clientErrors = {
        username: usernameChanged ? getUsernameError(trimmedUsername) : "",
        email: emailChanged ? getEmailError(trimmedEmail) : "",
        password: emailChanged && !password ? "Confirme sua senha para alterar o e-mail." : "",
    };

    function getError(field) {
        return serverErrors[field] || (submitted ? clientErrors[field] : "");
    }

    function clearServerError(field) {
        setServerErrors((previous) => ({ ...previous, [field]: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitted(true);

        if (!dirty || Object.values(clientErrors).some(Boolean)) return;

        const changes = {};
        if (usernameChanged) changes.username = trimmedUsername;
        if (emailChanged) {
            changes.email = trimmedEmail;
            changes.password = password;
        }

        try {
            setSaving(true);
            setServerErrors({});

            const updatedUser = await updateProfile(changes);

            setUsername(updatedUser.username);
            setEmail(updatedUser.email);
            setPassword("");
            setSubmitted(false);
            showToast({ type: "success", message: "Perfil atualizado." });
        } catch (error) {
            const fieldErrors = error.data?.errors;

            if (fieldErrors) {
                setServerErrors({
                    username: fieldErrors.username?.join(" ") || "",
                    email: fieldErrors.email?.join(" ") || "",
                    password: fieldErrors.password?.join(" ") || "",
                });
                if (fieldErrors.password) setPassword("");
            } else {
                showToast({ type: "error", message: error.message });
            }
        } finally {
            setSaving(false);
        }
    }

    const usernameError = getError("username");
    const emailError = getError("email");
    const passwordError = getError("password");

    return (
        <form className="auth-form profile-form" onSubmit={handleSubmit} noValidate>
            {!user.email && (
                <div className="insight-banner warning">
                    <div className="insight-icon">
                        <MailWarning size={18} />
                    </div>
                    <p>
                        <strong>Sua conta ainda não tem e-mail.</strong>{" "}
                        Cadastre um para poder entrar com ele.
                    </p>
                </div>
            )}

            <div className="auth-field">
                <label htmlFor="profile-username">Nome de usuário</label>
                <input
                    id="profile-username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={150}
                    value={username}
                    className={usernameError ? "input-error" : ""}
                    aria-invalid={Boolean(usernameError)}
                    aria-describedby="profile-username-help"
                    disabled={saving}
                    onChange={(event) => {
                        setUsername(event.target.value);
                        clearServerError("username");
                    }}
                />
                <span id="profile-username-help" className={usernameError ? "field-error" : "field-hint"}>
                    {usernameError || "Letras, números e @ . + - _"}
                </span>
            </div>

            <div className="auth-field">
                <label htmlFor="profile-email">E-mail</label>
                <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    value={email}
                    className={emailError ? "input-error" : ""}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby="profile-email-help"
                    disabled={saving}
                    onChange={(event) => {
                        setEmail(event.target.value);
                        clearServerError("email");
                        clearServerError("password");
                    }}
                />
                <span id="profile-email-help" className={emailError ? "field-error" : "field-hint"}>
                    {emailError || "Você pode entrar com ele ou com o nome de usuário."}
                </span>
            </div>

            {emailChanged && (
                <div className="auth-field">
                    <label htmlFor="profile-password">Senha atual</label>
                    <PasswordInput
                        id="profile-password"
                        autoComplete="current-password"
                        value={password}
                        invalid={Boolean(passwordError)}
                        describedBy="profile-password-help"
                        onChange={(event) => {
                            setPassword(event.target.value);
                            clearServerError("password");
                        }}
                    />
                    <span id="profile-password-help" className={passwordError ? "field-error" : "field-hint"}>
                        {passwordError || "Necessária para alterar o e-mail."}
                    </span>
                </div>
            )}

            <div className="profile-actions">
                <button type="submit" className="primary-button" disabled={!dirty || saving}>
                    <Save size={18} />
                    {saving ? "Salvando..." : "Salvar alterações"}
                </button>
            </div>
        </form>
    );
}

export default ProfileForm;
