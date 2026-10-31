import { useCallback, useState } from "react";

import Notification from "./Notification";
import { ToastContext } from "../context/ToastContext";

// Mostra um aviso por vez. Um aviso novo substitui o anterior; o id muda a
// key do <Notification>, o que reinicia o temporizador de 4 segundos.
function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = useCallback(({ type = "success", message }) => {
        setToast({ id: Date.now(), type, message });
    }, []);

    const closeToast = useCallback(() => setToast(null), []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}

            {toast && (
                <Notification
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={closeToast}
                />
            )}
        </ToastContext.Provider>
    );
}

export default ToastProvider;
