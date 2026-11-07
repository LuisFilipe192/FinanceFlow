import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";
import { Link } from "react-router-dom";

import BillUrgencyIcon from "./fixedBills/BillUrgencyIcon";
import { DATA_CHANGED_EVENT } from "../services/api";
import { getSidebarSummary } from "../services/dashboard";
import { getBudgetStatus } from "../utils/budget";
import { getBillStatusLabel, getBillUrgency, getNextBill } from "../utils/fixedBills";
import { formatCurrency } from "../utils/format";
import { MONTH_NAMES } from "../utils/insights";

function SidebarSummary() {
    const [data, setData] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        function reload() {
            setReloadKey((current) => current + 1);
        }

        window.addEventListener(DATA_CHANGED_EVENT, reload);

        return () => window.removeEventListener(DATA_CHANGED_EVENT, reload);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const timer = setTimeout(() => {
            getSidebarSummary({ signal: controller.signal })
                .then(setData)
                .catch((error) => {
                    if (error.name !== "AbortError") console.error(error);
                });
        }, 0);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [reloadKey]);

    if (!data) return null;

    const balance = Number(data.summary.balance);
    const spending = getBudgetStatus(Number(data.summary.expenses), data.summary.income);
    const nextBill = getNextBill(data.bills);
    const urgency = nextBill && getBillUrgency(nextBill);

    return (
        <section className="sidebar-summary" aria-label="Resumo do mês">
            <div className="sidebar-balance">
                <span>Saldo de {MONTH_NAMES[data.period.month - 1]}</span>
                <strong className={balance < 0 ? "negative" : ""}>{formatCurrency(balance)}</strong>

                {spending && (
                    <>
                        <div className="sidebar-spending-track">
                            <div
                                className={`sidebar-spending-fill ${spending.level}`}
                                style={{ width: `${Math.min(spending.ratio, 1) * 100}%` }}
                            />
                        </div>

                        <small>{Math.round(spending.ratio * 100)}% do que entrou já saiu</small>
                    </>
                )}
            </div>

            {nextBill && (
                <Link to="/transactions" className={`sidebar-next-bill ${urgency}`}>
                    <BillUrgencyIcon urgency={urgency} size={16} />

                    <span>
                        <strong>{nextBill.description}</strong>
                        <small>{getBillStatusLabel(nextBill)} - {formatCurrency(nextBill.amount)}</small>
                    </span>
                </Link>
            )}

            {!nextBill && data.bills.length > 0 && (
                <div className="sidebar-next-bill paid">
                    <CircleCheck size={16} />
                    <span><strong>Contas do mês pagas</strong></span>
                </div>
            )}
        </section>
    );
}

export default SidebarSummary;
