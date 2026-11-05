import { useLocation } from "react-router-dom";

import UserMenu from "./UserMenu";

const PAGE_INFO = {
    "/": {
        title: "Visão geral",
        description: "Acompanhe sua vida financeira em um só lugar.",
    },
    "/transactions": {
        title: "Transações",
        description: "Gerencie suas receitas e despesas.",
    },
    "/categories": {
        title: "Categorias",
        description: "Organize e acompanhe seus gastos.",
    },
    "/settings": {
        title: "Configurações",
        description: "Gerencie sua conta e seus dados.",
    },
};

const todayFormatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
});

function Header({ actionsRef }) {
    const location = useLocation();
    const currentPage = PAGE_INFO[location.pathname] || PAGE_INFO["/"];

    return (
        <header className="header">
            <div className="header-title">
                <span className="header-overline">
                    {todayFormatter.format(new Date())}
                </span>

                <h1>
                    {currentPage.title}
                    <span className="green-dot">.</span>
                </h1>

                <p>{currentPage.description}</p>
            </div>

            <div className="page-actions" ref={actionsRef} />

            <div className="header-actions">
                <UserMenu />
            </div>
        </header>
    );
}

export default Header;
