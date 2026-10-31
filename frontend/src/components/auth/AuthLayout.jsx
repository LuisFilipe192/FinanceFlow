import { LineChart, ShieldCheck, Tags } from "lucide-react";

import Brand from "../Brand";

const HIGHLIGHTS = [
    {
        icon: LineChart,
        title: "Resumo que conversa com você",
        text: "Veja quanto entrou, quanto saiu e como foi em relação ao mês passado.",
    },
    {
        icon: Tags,
        title: "Categorias do seu jeito",
        text: "Organize seus gastos e descubra para onde vai cada real.",
    },
    {
        icon: ShieldCheck,
        title: "Seus dados são só seus",
        text: "Cada conta enxerga apenas as próprias transações.",
    },
];

// Moldura das telas públicas (login e cadastro): painel da marca à esquerda
// e o formulário à direita. No celular, só o formulário, com o logo em cima.
function AuthLayout({ title, subtitle, children, footer }) {
    return (
        <div className="auth-page">
            <aside className="auth-brand">
                <Brand />

                <div className="auth-brand-content">
                    <h2>
                        Seu dinheiro,
                        <br />
                        <span>em fluxo.</span>
                    </h2>

                    <ul className="auth-highlights">
                        {HIGHLIGHTS.map(({ icon: Icon, title: itemTitle, text }) => (
                            <li key={itemTitle}>
                                <div className="auth-highlight-icon">
                                    <Icon size={18} />
                                </div>

                                <div>
                                    <strong>{itemTitle}</strong>
                                    <p>{text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <span className="auth-brand-footer">© 2026 FinanceFlow</span>
            </aside>

            <main className="auth-main">
                <div className="auth-card">
                    <div className="auth-mobile-brand">
                        <Brand />
                    </div>

                    <h1>
                        {title}
                        <span className="green-dot">.</span>
                    </h1>
                    <p className="auth-subtitle">{subtitle}</p>

                    {children}

                    <div className="auth-footer">{footer}</div>
                </div>
            </main>
        </div>
    );
}

export default AuthLayout;
