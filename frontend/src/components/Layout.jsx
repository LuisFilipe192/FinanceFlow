import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import ToastProvider from "./ToastProvider";

// Estrutura comum das páginas. O <Outlet /> é onde o React Router
// renderiza a página da rota atual (Dashboard, Transações, Categorias).
function Layout() {
    return (
        <ToastProvider>
            <div className="app-layout">
                <Sidebar />

                <main className="main-content">
                    <Header />
                    <Outlet />
                </main>
            </div>
        </ToastProvider>
    );
}

export default Layout;
