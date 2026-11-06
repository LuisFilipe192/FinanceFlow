import { useEffect, useState } from "react";
import { AlertTriangle, CircleCheck, CircleDashed, Clock } from "lucide-react";

import PayBillModal from "./PayBillModal";
import { getFixedBills } from "../../services/fixedBills";
import { getBillStatusLabel } from "../../utils/fixedBills";
import { formatCurrency } from "../../utils/format";

const STATUS_ICONS = {
    paid: CircleCheck,
    pending: CircleDashed,
    due_today: Clock,
    overdue: AlertTriangle,
};

function FixedBillsCard({ period, refreshKey, onPaid }) {
    const [data, setData] = useState(null);
    const [billToPay, setBillToPay] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        getFixedBills({ ...period, signal: controller.signal })
            .then(setData)
            .catch((error) => {
                if (error.name !== "AbortError") console.error(error);
            });

        return () => controller.abort();
    }, [period, refreshKey]);

    if (!data || data.bills.length === 0) return null;

    const paidCount = data.bills.filter((bill) => bill.status === "paid").length;
    const pendingTotal = Number(data.summary.pending_total);

    return (
        <div className="transactions-table-card fixed-bills-card">
            <div className="transactions-table-header">
                <h3>Contas fixas do mês</h3>
                <span>
                    {paidCount} de {data.bills.length} pagas
                    {pendingTotal > 0 && ` · faltam ${formatCurrency(pendingTotal)}`}
                </span>
            </div>
            <div className="transactions-header-divider"></div>

            <ul className="fixed-bills-list">
                {data.bills.map((bill) => {
                    const Icon = STATUS_ICONS[bill.status];

                    return (
                        <li className={`fixed-bill ${bill.status}`} key={bill.id}>
                            <Icon size={18} className="fixed-bill-icon" />

                            <div className="fixed-bill-info">
                                <strong>{bill.description}</strong>
                                <span>{bill.category_name} · {getBillStatusLabel(bill)}</span>
                            </div>

                            <strong className="fixed-bill-amount">
                                {formatCurrency(bill.payment ? bill.payment.amount : bill.amount)}
                            </strong>

                            {bill.status !== "paid" && (
                                <button
                                    type="button"
                                    className="secondary-button fixed-bill-pay"
                                    aria-label={`Pagar ${bill.description}`}
                                    onClick={() => setBillToPay(bill)}
                                >
                                    Pagar
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>

            {billToPay && (
                <PayBillModal
                    bill={billToPay}
                    period={period}
                    onClose={() => setBillToPay(null)}
                    onPaid={(payment) => {
                        setBillToPay(null);
                        onPaid(payment);
                    }}
                />
            )}
        </div>
    );
}

export default FixedBillsCard;
