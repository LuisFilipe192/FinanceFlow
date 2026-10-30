
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tags,
    Settings,
    Wallet
} from "lucide-react";

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="brand">
                <div className="brand-icon">
                    <Wallet size={21} />
                </div>

                <span>
                    Finance<span className="brand-highlight">Flow</span>
                    <span className="brand-dot">.</span>
                </span>
            </div>

            <div className="sidebar-label">WORKSPACE</div>

            <nav className="sidebar-nav">
                <a href="#" className="nav-item active">
                    <LayoutDashboard size={18} />
                    <span>Visão geral</span>
                </a>

                <a href="#" className="nav-item">
                    <ArrowLeftRight size={18} />
                    <span>Transações</span>
                </a>

                <a href="#" className="nav-item">
                    <Tags size={18} />
                    <span>Categorias</span>
                </a>
            </nav>

            <div className="sidebar-bottom">
                <a href="#" className="nav-item">
                    <Settings size={18} />
                    <span>Configurações</span>
                </a>

                <div className="sidebar-status">
                    <span className="status-dot"></span>
                    Sistema operacional
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
