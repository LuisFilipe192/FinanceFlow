import { useState } from "react";
import { Trash2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import DeleteAccountModal from "../components/settings/DeleteAccountModal";

function Settings() {
    const { user } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    return (
        <section className="dashboard-section">
            <div className="section-heading">
                <div>
                    <span className="section-overline">
                        04 / ACCOUNT
                    </span>
                    <h2>Configurações</h2>
                    <p>Gerencie sua conta.</p>
                </div>
            </div>

            <div className="transactions-table-card">
                <div className="transactions-table-header">
                    <h3>Minha conta</h3>
                </div>
                <div className="transactions-header-divider"></div>

                <div className="transaction-row">
                    <div className="transaction-info">
                        <strong>{user.username}</strong>
                        <div className="transaction-meta">
                            <span>Nome de usuário</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="transactions-table-card danger-zone">
                <div className="transactions-table-header">
                    <h3>Zona de perigo</h3>
                </div>
                <div className="transactions-header-divider"></div>

                <div className="transaction-row">
                    <div className="transaction-info">
                        <strong>Excluir conta</strong>
                        <div className="transaction-meta">
                            <span>Apaga sua conta, suas transações e suas categorias. Não pode ser desfeito.</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="danger-button"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <Trash2 size={18} />
                        Excluir conta
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
            )}
        </section>
    );
}

export default Settings;
