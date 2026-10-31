import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(", ");

function Modal({ title, description, onClose, closeDisabled = false, children }) {
    const dialogRef = useRef(null);
    const pressedOnOverlay = useRef(false);
    const titleId = useId();
    const descriptionId = useId();

    // Foco: ao abrir, vai para dentro do modal; ao fechar, volta para o botão
    // que abriu. Sem isso, quem usa teclado "se perde" na página.
    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const dialog = dialogRef.current;

        // Componentes filhos podem já ter focado um campo (efeitos dos filhos
        // rodam antes). Senão: primeiro campo, ou o primeiro botão de ação
        // (em confirmações é o "Cancelar", a opção segura).
        if (!dialog.contains(document.activeElement)) {
            const target =
                dialog.querySelector("input:not([disabled]), textarea, select") ||
                dialog.querySelector(".modal-actions button") ||
                dialog;
            target.focus();
        }

        return () => {
            if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
                previouslyFocused.focus();
            }
        };
    }, []);

    // Esc fecha o modal, como em qualquer janela do sistema. Fica bloqueado
    // enquanto algo está sendo salvo (closeDisabled), igual ao botão X.
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key !== "Escape" || closeDisabled) return;

            // Se o calendário estiver aberto, o Esc é dele: fecha só o calendário.
            if (document.querySelector(".react-datepicker-popper")) return;

            onClose();
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, closeDisabled]);

    // Tab circula só dentro do modal (focus trap).
    function handleKeyDown(event) {
        if (event.key !== "Tab") return;

        const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    // Clique fora fecha, mas só se o clique começou E terminou no fundo.
    // Assim, selecionar texto num campo e soltar o mouse fora não fecha nada.
    return (
        <div
            className="modal-overlay"
            onMouseDown={(event) => {
                pressedOnOverlay.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
                if (
                    pressedOnOverlay.current &&
                    event.target === event.currentTarget &&
                    !closeDisabled
                ) {
                    onClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                className="transaction-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <div className="modal-header">
                    <div>
                        <h2 id={titleId}>{title}</h2>
                        {description && <p id={descriptionId}>{description}</p>}
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
