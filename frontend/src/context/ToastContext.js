import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

// Uso: const showToast = useToast();
//      showToast({ type: "success", message: "Transação registrada." });
export function useToast() {
    const showToast = useContext(ToastContext);

    if (!showToast) {
        throw new Error("useToast precisa estar dentro de <ToastProvider>.");
    }

    return showToast;
}
