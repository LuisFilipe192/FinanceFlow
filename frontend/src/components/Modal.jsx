import { useEffect } from "react";
import { X } from "lucide-react";

function Modal({ title, description, onClose, closeDisabled = false, children }) {
    // Esc fecha o modal, como em qualquer janela do sistema. Fica bloqueado
    // enquanto algo está sendo salvo (closeDisabled), igual ao botão X.
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape" && !closeDisabled) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, closeDisabled]);

    return (
        <div className="modal-overlay">
            <div
                className="transaction-modal"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="modal-header">
                    <div>
                        <h2>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        aria-label="Fechar"
                        onClick={onClose}
                        disabled={closeDisabled}
                    >
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}

export default Modal;
