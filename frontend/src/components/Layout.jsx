import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

// Estrutura comum das páginas. O <Outlet /> é onde o React Router
// renderiza a página da rota atual (Dashboard, Transações, Categorias).
function Layout() {
    return (
        <div className="app-layout">
            <Sidebar />

            <main className="main-content">
                <Header />
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
