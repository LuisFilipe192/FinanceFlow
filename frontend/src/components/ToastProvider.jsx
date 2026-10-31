import { useCallback, useRef, useState } from "react";

import Notification from "./Notification";
import { ToastContext } from "../context/ToastContext";

// Mostra um aviso por vez. Um aviso novo substitui o anterior; o id muda a
// key do <Notification>, o que reinicia o temporizador.
function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const nextId = useRef(0);

    const showToast = useCallback(({ type = "success", message, action, duration = 4000 }) => {
        nextId.current += 1;
        setToast({ id: nextId.current, type, message, action, duration });
    }, []);

    // Só fecha se ainda for o mesmo aviso. Sem isso, um clique em "Desfazer"
    // (que já mostra um aviso novo) fecharia o aviso novo junto.
    const closeToast = useCallback((id) => {
        setToast((current) => (current?.id === id ? null : current));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}

            {toast && (
                <Notification
                    key={toast.id}
                    {...toast}
                    onClose={closeToast}
                />
            )}
        </ToastContext.Provider>
    );
}

export default ToastProvider;
