import { useState } from "react";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";

// Campo de senha com botão de mostrar/ocultar e aviso de Caps Lock:
// os dois motivos mais comuns de "errei a senha sem saber por quê".
function PasswordInput({ id, value, onChange, autoComplete, invalid, describedBy, placeholder }) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    function checkCapsLock(event) {
        setCapsLock(event.getModifierState?.("CapsLock") ?? false);
    }

    return (
        <>
            <div className="password-field">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    className={invalid ? "input-error" : ""}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    onKeyDown={checkCapsLock}
                    onKeyUp={checkCapsLock}
                    onBlur={() => setCapsLock(false)}
                />

                <button
                    type="button"
                    className="password-toggle"
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={visible}
                    onClick={() => setVisible((current) => !current)}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {capsLock && (
                <span className="field-hint warning" role="status">
                    <AlertTriangle size={13} />
                    Caps Lock está ativado
                </span>
            )}
        </>
    );
}

export default PasswordInput;
