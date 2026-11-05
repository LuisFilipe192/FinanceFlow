import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { PageActionsContext } from "../context/PageActionsContext";

// Estrutura comum das páginas. O <Outlet /> é onde o React Router
// renderiza a página da rota atual (Dashboard, Transações, Categorias).
function Layout() {
    const [actionsTarget, setActionsTarget] = useState(null);

    return (
        <PageActionsContext.Provider value={actionsTarget}>
            <div className="app-layout">
                <Sidebar />

                <main className="main-content">
                    <Header actionsRef={setActionsTarget} />
                    <Outlet />
                </main>
            </div>
        </PageActionsContext.Provider>
    );
}

export default Layout;
