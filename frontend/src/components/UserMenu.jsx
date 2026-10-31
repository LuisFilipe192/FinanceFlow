import { useEffect, useId, useRef, useState } from "react";
import { LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// "luis.felipe" -> "LF", "maria" -> "MA". Separa por . _ - + @ e espaços.
function getInitials(username) {
    const parts = username.split(/[\s._\-+@]+/).filter(Boolean);

    const initials = parts.length >= 2
        ? parts[0][0] + parts[1][0]
        : username.slice(0, 2);

    return initials.toUpperCase();
}

function UserMenu() {
    const { user, logout } = useAuth();
    const showToast = useToast();

    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuId = useId();

    // Fecha ao clicar fora ou apertar Esc (o foco volta para o avatar).
    useEffect(() => {
        if (!open) return;

        function handleMouseDown(event) {
            if (!containerRef.current.contains(event.target)) setOpen(false);
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current.focus();
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    async function handleLogout() {
        try {
            setLoggingOut(true);
            await logout();

            // O RequireAuth leva para /login assim que o status vira
            // "anonymous" (com replace: "voltar" não reabre página privada).
            showToast({ type: "info", message: `Até logo, ${user.username}!` });
        } catch (error) {
            console.error(error);
            setLoggingOut(false);
            showToast({ type: "error", message: error.message });
        }
    }

    if (!user) return null;

    return (
        <div className="user-menu" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                className="user-avatar"
                aria-label={`Conta de ${user.username}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onClick={() => setOpen((current) => !current)}
            >
                {getInitials(user.username)}
            </button>

            {open && (
                <div className="user-menu-popover" id={menuId} role="menu">
                    <div className="user-menu-header">
                        <span>Conectado como</span>
                        <strong title={user.username}>{user.username}</strong>
                    </div>

                    <button
                        type="button"
                        role="menuitem"
                        className="user-menu-item danger"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        // Ao abrir o menu, o foco vai para a única ação dele.
                        autoFocus
                    >
                        <LogOut size={16} />
                        {loggingOut ? "Saindo..." : "Sair"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
