import { useEffect } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

function Notification({ type = "success", message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

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

            <button type="button" aria-label="Fechar aviso" onClick={onClose}>
                <X size={18} />
            </button>
        </div>
    );
}

export default Notification;
