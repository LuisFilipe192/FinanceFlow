import { Bell, Search } from "lucide-react";

function Header() {
    return (
        <header className="header">
            <div>
                <span className="header-overline">
                    FINANCE / OVERVIEW
                </span>

                <h1>
                    Visão geral<span className="green-dot">.</span>
                </h1>

                <p>Acompanhe sua vida financeira em um só lugar.</p>
            </div>

            <div className="header-actions">
                <button className="icon-button">
                    <Search size={18} />
                </button>

                <button className="icon-button">
                    <Bell size={18} />
                </button>

                <div className="user-avatar">LF</div>
            </div>
        </header>
    );
}

export default Header;
