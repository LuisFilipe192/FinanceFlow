
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tags,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import Brand from "./Brand";

function Sidebar() {
    return (
        <aside className="sidebar">
            <Brand />

            <div className="sidebar-label">WORKSPACE</div>

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
            </nav>
        </aside>
    );
}

export default Sidebar;
