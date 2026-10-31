import { Wallet } from "lucide-react";

// Logo do FinanceFlow (Sidebar e telas de login/cadastro).
function Brand() {
    return (
        <div className="brand">
            <div className="brand-icon">
                <Wallet size={21} />
            </div>

            <span>
                Finance<span className="brand-highlight">Flow</span>
                <span className="brand-dot">.</span>
            </span>
        </div>
    );
}

export default Brand;
