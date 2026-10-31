import { useAuth } from "../context/AuthContext";

function Settings() {
    const { user } = useAuth();

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
        </section>
    );
}

export default Settings;
