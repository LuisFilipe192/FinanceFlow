
import { useLocation } from "react-router-dom";

import UserMenu from "./UserMenu";

function Header() {
    const location = useLocation();

    const pageInfo = {
        "/": {
            overline: "FINANCE / OVERVIEW",
            title: "Visão geral",
            description: "Acompanhe sua vida financeira em um só lugar.",
        },
        "/transactions": {
            overline: "FINANCE / TRANSACTIONS",
            title: "Transações",
            description: "Gerencie suas receitas e despesas.",
        },
        "/categories": {
            overline: "FINANCE / CATEGORIES",
            title: "Categorias",
            description: "Organize e acompanhe seus gastos.",
        },
    };

    const currentPage = pageInfo[location.pathname] || pageInfo["/"];

    return (
        <header className="header">
            <div>
                <span className="header-overline">
                    {currentPage.overline}
                </span>

                <h1>
                    {currentPage.title}
                    <span className="green-dot">.</span>
                </h1>

                <p>{currentPage.description}</p>
            </div>

            <div className="header-actions">
                <UserMenu />
            </div>
        </header>
    );
}

export default Header;
