
import { useLocation } from "react-router-dom";

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

            {/* Busca e notificações voltam quando existirem de verdade.
                O avatar passa a usar o usuário logado na etapa 7. */}
            <div className="header-actions">
                <div className="user-avatar">LF</div>
            </div>
        </header>
    );
}

export default Header;
