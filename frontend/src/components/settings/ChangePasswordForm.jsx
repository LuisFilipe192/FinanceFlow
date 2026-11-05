import { useState } from "react";
import { Check, Circle, KeyRound } from "lucide-react";

import PasswordInput from "../auth/PasswordInput";
import { useToast } from "../../context/ToastContext";
import { changePassword } from "../../services/auth";
import { getPasswordRules } from "../../utils/validation";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmation: "" };

function ChangePasswordForm() {
    const showToast = useToast();

    const [form, setForm] = useState(EMPTY_FORM);
    const [submitted, setSubmitted] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const rules = getPasswordRules(form.newPassword, form.confirmation);

    const clientErrors = {
        currentPassword: form.currentPassword ? "" : "Informe sua senha atual.",
        newPassword: !rules[0].ok || !rules[1].ok ? "A nova senha ainda não atende às regras abaixo." : "",
        confirmation: !form.confirmation
            ? "Repita a nova senha."
            : !rules[2].ok
                ? "As senhas não coincidem."
                : "",
    };

    function getError(field) {
        return serverErrors[field] || (submitted ? clientErrors[field] : "");
    }

    function updateField(field, value) {
        setForm((previous) => ({ ...previous, [field]: value }));
        setServerErrors((previous) => ({ ...previous, [field]: "" }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitted(true);

        if (Object.values(clientErrors).some(Boolean)) return;

        try {
            setSaving(true);
            setServerErrors({});

            await changePassword(form);

            setForm(EMPTY_FORM);
            setSubmitted(false);
            showToast({
                type: "success",
                message: "Senha alterada. As outras sessões abertas foram encerradas.",
            });
        } catch (error) {
            const fieldErrors = error.data?.errors;

            if (fieldErrors) {
                setServerErrors({
                    currentPassword: fieldErrors.current_password?.join(" ") || "",
                    newPassword: fieldErrors.new_password?.join(" ") || "",
                    confirmation: fieldErrors.new_password_confirmation?.join(" ") || "",
                });
                if (fieldErrors.current_password) {
                    setForm((previous) => ({ ...previous, currentPassword: "" }));
                }
            } else {
                showToast({ type: "error", message: error.message });
            }
        } finally {
            setSaving(false);
        }
    }

    const currentError = getError("currentPassword");
    const newError = getError("newPassword");
    const confirmationError = getError("confirmation");
    const touched = Object.values(form).some(Boolean);

    return (
        <form className="auth-form profile-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
                <label htmlFor="password-current">Senha atual</label>
                <PasswordInput
                    id="password-current"
                    autoComplete="current-password"
                    value={form.currentPassword}
                    invalid={Boolean(currentError)}
                    describedBy={currentError ? "password-current-error" : undefined}
                    onChange={(event) => updateField("currentPassword", event.target.value)}
                />
                {currentError && (
                    <span id="password-current-error" className="field-error">{currentError}</span>
                )}
            </div>

            <div className="auth-field">
                <label htmlFor="password-new">Nova senha</label>
                <PasswordInput
                    id="password-new"
                    autoComplete="new-password"
                    value={form.newPassword}
                    invalid={Boolean(newError)}
                    describedBy="password-new-rules"
                    onChange={(event) => updateField("newPassword", event.target.value)}
                />
                {newError && <span className="field-error">{newError}</span>}
            </div>

            <div className="auth-field">
                <label htmlFor="password-confirmation">Confirme a nova senha</label>
                <PasswordInput
                    id="password-confirmation"
                    autoComplete="new-password"
                    value={form.confirmation}
                    invalid={Boolean(confirmationError)}
                    describedBy={confirmationError ? "password-confirmation-error" : undefined}
                    onChange={(event) => updateField("confirmation", event.target.value)}
                />
                {confirmationError && (
                    <span id="password-confirmation-error" className="field-error">{confirmationError}</span>
                )}
            </div>

            <ul className="password-rules" id="password-new-rules" aria-live="polite">
                {rules.map((rule) => (
                    <li key={rule.label} className={rule.ok ? "ok" : ""}>
                        {rule.ok ? <Check size={14} /> : <Circle size={14} />}
                        {rule.label}
                    </li>
                ))}
            </ul>

            <div className="profile-actions">
                <button type="submit" className="primary-button" disabled={!touched || saving}>
                    <KeyRound size={18} />
                    {saving ? "Alterando..." : "Alterar senha"}
                </button>
            </div>
        </form>
    );
}

export default ChangePasswordForm;
