import { useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

// action: { label, onClick } opcional, por exemplo "Desfazer".
function Notification({ id, type = "success", message, action, duration = 4000, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
    };

    const Icon = icons[type] || Info;

    return (
        <div
            className={`notification notification-${type}`}
            role={type === "error" ? "alert" : "status"}
        >
            <Icon size={22} />

            <span>{message}</span>

            {action && (
                <button
                    type="button"
                    className="notification-action"
                    onClick={() => {
                        action.onClick();
                        onClose(id);
                    }}
                >
                    {action.label}
                </button>
            )}

            <button type="button" aria-label="Fechar aviso" onClick={() => onClose(id)}>
                <X size={18} />
            </button>

            {/* Barra que esvazia: mostra quanto tempo falta para o aviso sumir. */}
            {action && (
                <span
                    className="notification-timer"
                    style={{ animationDuration: `${duration}ms` }}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

export default Notification;
