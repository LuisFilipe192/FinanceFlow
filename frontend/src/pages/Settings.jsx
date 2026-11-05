import { useState } from "react";
import { Trash2 } from "lucide-react";

import DeleteAccountModal from "../components/settings/DeleteAccountModal";
import ProfileForm from "../components/settings/ProfileForm";

function Settings() {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    return (
        <section className="dashboard-section">
            <div className="section-heading">
                <div>
                    <span className="section-overline">
                        04 / ACCOUNT
                    </span>
                    <h2>Sua conta</h2>
                    <p>Dados de acesso e exclusão da conta.</p>
                </div>
            </div>

            <div className="transactions-table-card">
                <div className="transactions-table-header">
                    <h3>Perfil</h3>
                    <span>Nome de usuário e e-mail usados para entrar.</span>
                </div>
                <div className="transactions-header-divider"></div>

                <ProfileForm />
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
