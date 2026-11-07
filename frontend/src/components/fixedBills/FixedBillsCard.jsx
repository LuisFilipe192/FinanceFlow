import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

import BillFormModal from "./BillFormModal";
import BillUrgencyIcon from "./BillUrgencyIcon";
import PayBillModal from "./PayBillModal";
import ConfirmDialog from "../ConfirmDialog";
import { useToast } from "../../context/ToastContext";
import { deleteFixedBill, getFixedBills } from "../../services/fixedBills";
import { getBillStatusLabel, getBillUrgency } from "../../utils/fixedBills";
import { formatCurrency } from "../../utils/format";

function FixedBillsCard({ period, categories, refreshKey, onCategoryCreated, onPaid }) {
    const showToast = useToast();

    const [data, setData] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [billToPay, setBillToPay] = useState(null);
    const [billToDelete, setBillToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    // showForm abre o modal; editingBill diz se é edição (objeto) ou criação (null).
    const [showForm, setShowForm] = useState(false);
    const [editingBill, setEditingBill] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        getFixedBills({ ...period, signal: controller.signal })
            .then(setData)
            .catch((error) => {
                if (error.name !== "AbortError") console.error(error);
            });

        return () => controller.abort();
    }, [period, refreshKey, reloadKey]);

    function openForm(bill = null) {
        setEditingBill(bill);
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingBill(null);
    }

    function handleSaved(bill, isEditing) {
        closeForm();
        setReloadKey((current) => current + 1);
        showToast({
            type: "success",
            message: isEditing ? `Conta "${bill.description}" atualizada.` : `Conta "${bill.description}" cadastrada.`,
        });
    }

    async function handleDelete() {
        try {
            setDeleting(true);
            await deleteFixedBill(billToDelete.id);

            showToast({ type: "success", message: `Conta "${billToDelete.description}" excluída.` });
            setBillToDelete(null);
            setReloadKey((current) => current + 1);
        } catch (error) {
            console.error(error);
            showToast({ type: "error", message: error.message });
        } finally {
            setDeleting(false);
        }
    }

    if (!data) return null;

    const paidCount = data.bills.filter((bill) => bill.status === "paid").length;
    const pendingTotal = Number(data.summary.pending_total);

    return (
        <div className="transactions-table-card fixed-bills-card">
            <div className="fixed-bills-header">
                <div className="transactions-table-header">
                    <h3>Contas fixas do mês</h3>
                    <span>
                        {data.bills.length === 0
                            ? "Aluguel, internet, assinaturas: pagamentos que se repetem todo mês."
                            : `${paidCount} de ${data.bills.length} pagas`}
                        {pendingTotal > 0 && ` · faltam ${formatCurrency(pendingTotal)}`}
                    </span>
                </div>

                <button type="button" className="secondary-button" onClick={() => openForm()}>
                    <Plus size={16} />
                    Nova conta
                </button>
            </div>

            {data.bills.length > 0 && (
                <>
                    <div className="transactions-header-divider"></div>

                    <ul className="fixed-bills-list">
                        {data.bills.map((bill) => {
                            const urgency = getBillUrgency(bill);

                            return (
                                <li className={`fixed-bill ${urgency}`} key={bill.id}>
                                    <BillUrgencyIcon urgency={urgency} size={18} className="fixed-bill-icon" />

                                    <div className="fixed-bill-info">
                                        <strong>{bill.description}</strong>
                                        <span>{bill.category_name} · {getBillStatusLabel(bill)}</span>
                                    </div>

                                    <strong className="fixed-bill-amount">
                                        {formatCurrency(bill.payment ? bill.payment.amount : bill.amount)}
                                    </strong>

                                    {bill.status === "paid" ? (
                                        <span className="fixed-bill-paid">
                                            <Check size={14} />
                                            Pago
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="secondary-button fixed-bill-pay"
                                            aria-label={`Pagar ${bill.description}`}
                                            onClick={() => setBillToPay(bill)}
                                        >
                                            Pagar
                                        </button>
                                    )}

                                    <div className="row-actions">
                                        <button
                                            type="button"
                                            className="row-action"
                                            aria-label={`Editar conta ${bill.description}`}
                                            title="Editar"
                                            onClick={() => openForm(bill)}
                                        >
                                            <Pencil size={15} />
                                        </button>

                                        <button
                                            type="button"
                                            className="row-action danger"
                                            aria-label={`Excluir conta ${bill.description}`}
                                            title="Excluir"
                                            onClick={() => setBillToDelete(bill)}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

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

            {showForm && (
                <BillFormModal
                    bill={editingBill}
                    categories={categories}
                    onCategoryCreated={onCategoryCreated}
                    onSaved={handleSaved}
                    onClose={closeForm}
                />
            )}

            {billToDelete && (
                <ConfirmDialog
                    title="Excluir conta fixa?"
                    description={`"${billToDelete.description}" deixa de aparecer nos próximos meses. Os pagamentos já registrados continuam nas suas transações.`}
                    confirmLabel="Excluir conta"
                    loadingLabel="Excluindo..."
                    loading={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setBillToDelete(null)}
                />
            )}
        </div>
    );
}

export default FixedBillsCard;
