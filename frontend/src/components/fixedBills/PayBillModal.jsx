import { useState } from "react";
import DatePicker from "react-datepicker";
import { ptBR } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import CurrencyInput from "../CurrencyInput";
import Modal from "../Modal";
import { payFixedBill } from "../../services/fixedBills";
import { getDefaultPaymentDate } from "../../utils/fixedBills";
import {
    centsToNumber,
    formatCurrency,
    formatDateToISO,
    numberToCents,
    parseISODate,
} from "../../utils/format";

function PayBillModal({ bill, period, onPaid, onClose }) {
    const [amount, setAmount] = useState(numberToCents(bill.amount));
    const [date, setDate] = useState(getDefaultPaymentDate(bill, period));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const value = centsToNumber(amount);

    async function handleSubmit(event) {
        event.preventDefault();

        if (value <= 0) {
            setError("Informe o valor pago.");
            return;
        }

        if (!date) {
            setError("Informe a data do pagamento.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const payment = await payFixedBill(bill.id, { amount: value.toFixed(2), date });

            onPaid(payment);
        } catch (requestError) {
            console.error(requestError);
            setError(requestError.message);
            setSaving(false);
        }
    }

    return (
        <Modal
            title={`Pagar ${bill.description}`}
            description="O pagamento entra nas suas despesas do mês."
            onClose={onClose}
            closeDisabled={saving}
        >
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <label htmlFor="bill-payment-amount">Valor pago</label>
                <CurrencyInput
                    id="bill-payment-amount"
                    value={amount}
                    disabled={saving}
                    onChange={(digits) => {
                        setAmount(digits);
                        setError("");
                    }}
                />

                <label htmlFor="bill-payment-date">Data do pagamento</label>
                <DatePicker
                    autoComplete="off"
                    id="bill-payment-date"
                    selected={date ? parseISODate(date) : null}
                    onChange={(selected) => {
                        setDate(selected ? formatDateToISO(selected) : "");
                        setError("");
                    }}
                    locale={ptBR}
                    dateFormat="dd/MM/yyyy"
                    showPopperArrow={false}
                />

                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="modal-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button type="submit" className="primary-button" disabled={saving}>
                        {saving ? "Registrando..." : `Pagar ${formatCurrency(value)}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default PayBillModal;
