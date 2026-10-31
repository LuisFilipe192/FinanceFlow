import { useEffect, useState } from "react";

import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getAccountSummary } from "../../services/auth";

function pluralize(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function getDescription(summary) {
    if (!summary) {
        return "Todas as suas transações e categorias serão apagadas para sempre.";
    }

    const transactions = pluralize(summary.transactions, "transação", "transações");
    const categories = pluralize(summary.categories, "categoria", "categorias");

    return `Serão apagadas para sempre ${transactions} e ${categories}.`;
}

function DeleteAccountModal({ onClose }) {
    const { user, deleteAccount } = useAuth();
    const showToast = useToast();

    const [summary, setSummary] = useState(null);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        getAccountSummary({ signal: controller.signal })
            .then(setSummary)
            .catch((requestError) => {
                if (requestError.name !== "AbortError") console.error(requestError);
            });

        return () => controller.abort();
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!password) {
            setError("Informe sua senha.");
            return;
        }

        const username = user.username;

        try {
            setDeleting(true);
            setError("");

            await deleteAccount(password);

            showToast({ type: "info", message: `A conta ${username} foi excluída.` });
        } catch (requestError) {
            console.error(requestError);
            setDeleting(false);
            setError(requestError.data?.errors?.password?.[0] || requestError.message);
        }
    }

    return (
        <Modal
            title="Excluir conta?"
            description={getDescription(summary)}
            onClose={onClose}
            closeDisabled={deleting}
        >
            <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="delete-account-password">
                    Confirme sua senha para continuar
                </label>

                <input
                    id="delete-account-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    className={error ? "input-error" : ""}
                    aria-invalid={Boolean(error)}
                    aria-describedby="delete-account-password-help"
                    onChange={(event) => {
                        setPassword(event.target.value);
                        setError("");
                    }}
                    disabled={deleting}
                />

                <div className="field-help" id="delete-account-password-help">
                    {error ? (
                        <span className="field-error" role="alert">{error}</span>
                    ) : (
                        <span>Essa ação não pode ser desfeita.</span>
                    )}
                </div>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={deleting}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="danger-button"
                        disabled={deleting || !password}
                    >
                        {deleting ? "Excluindo..." : "Excluir minha conta"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default DeleteAccountModal;
