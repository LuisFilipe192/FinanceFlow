
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tags,
    Settings,
} from "lucide-react";

import { Link, NavLink } from "react-router-dom";

import Brand from "./Brand";
import SidebarSummary from "./SidebarSummary";

function Sidebar() {
    return (
        <aside className="sidebar">
            <Link to="/" className="sidebar-brand-link" aria-label="FinanceFlow: ir para a visão geral">
                <Brand />
            </Link>

            <div className="sidebar-label">Menu</div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""}`
                    }
                >
                    <LayoutDashboard size={18} />
                    <span>Visão geral</span>
                </NavLink>

                <NavLink
                    to="/transactions"
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""}`
                    }
                >
                    <ArrowLeftRight size={18} />
                    <span>Transações</span>
                </NavLink>

                <NavLink
                    to="/categories"
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""}`
                    }
                >
                    <Tags size={18} />
                    <span>Categorias</span>
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `nav-item ${isActive ? "active" : ""}`
                    }
                >
                    <Settings size={18} />
                    <span>Configurações</span>
                </NavLink>
            </nav>

            <SidebarSummary />
        </aside>
    );
}

export default Sidebar;
