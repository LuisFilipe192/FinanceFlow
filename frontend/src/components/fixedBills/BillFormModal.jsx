import { useState } from "react";

import CategoryPicker from "../categories/CategoryPicker";
import CurrencyInput from "../CurrencyInput";
import Modal from "../Modal";
import { createFixedBill, updateFixedBill } from "../../services/fixedBills";
import { DEFAULT_CATEGORY_NAME } from "../../utils/categories";
import { centsToNumber, numberToCents } from "../../utils/format";

function getInitialCategory(bill, categories) {
    if (bill) return String(bill.category);

    const fallback = categories.find((category) => category.name === DEFAULT_CATEGORY_NAME);

    return fallback ? String(fallback.id) : "";
}

function getErrors({ description, amount, dueDay, category }) {
    const day = Number(dueDay);

    return {
        description: description.trim() ? "" : "Informe o nome da conta.",
        amount: centsToNumber(amount) > 0 ? "" : "Informe o valor da conta.",
        due_day: dueDay && (day < 1 || day > 31) ? "Use um dia entre 1 e 31." : "",
        category: category ? "" : "Escolha uma categoria.",
    };
}

function firstMessage(value) {
    return Array.isArray(value) ? value[0] : value;
}

function BillFormModal({ bill, categories, onCategoryCreated, onSaved, onClose }) {
    const isEditing = Boolean(bill);

    const [description, setDescription] = useState(bill?.description ?? "");
    const [amount, setAmount] = useState(numberToCents(bill?.amount));
    const [dueDay, setDueDay] = useState(bill?.due_day ? String(bill.due_day) : "");
    const [category, setCategory] = useState(getInitialCategory(bill, categories));
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        const validation = getErrors({ description, amount, dueDay, category });
        setErrors(validation);

        if (Object.values(validation).some(Boolean)) return;

        const payload = {
            description: description.trim(),
            amount: centsToNumber(amount).toFixed(2),
            due_day: dueDay ? Number(dueDay) : null,
            category: Number(category),
        };

        try {
            setSaving(true);
            setFormError("");

            const saved = isEditing
                ? await updateFixedBill(bill.id, payload)
                : await createFixedBill(payload);

            onSaved(saved, isEditing);
        } catch (error) {
            console.error(error);
            setSaving(false);

            const fieldErrors = error.data ?? {};
            const known = ["description", "amount", "due_day", "category"].filter((field) => fieldErrors[field]);

            if (known.length > 0) {
                setErrors(Object.fromEntries(known.map((field) => [field, firstMessage(fieldErrors[field])])));
            } else {
                setFormError(error.message);
            }
        }
    }

    function clearError(field) {
        setErrors((previous) => ({ ...previous, [field]: "" }));
    }

    return (
        <Modal
            title={isEditing ? "Editar conta fixa" : "Nova conta fixa"}
            description={
                isEditing
                    ? "Vale para os próximos pagamentos. Os já registrados não mudam."
                    : "Um pagamento que se repete todo mês, como aluguel ou internet."
            }
            onClose={onClose}
            closeDisabled={saving}
        >
            <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <label htmlFor="bill-description">Nome da conta</label>
                <input
                    autoComplete="off"
                    id="bill-description"
                    type="text"
                    maxLength={200}
                    placeholder="Ex.: Aluguel, Internet..."
                    value={description}
                    className={errors.description ? "input-error" : ""}
                    aria-invalid={Boolean(errors.description)}
                    disabled={saving}
                    onChange={(event) => {
                        setDescription(event.target.value);
                        clearError("description");
                    }}
                />
                {errors.description && <span className="field-error">{errors.description}</span>}

                <label htmlFor="bill-amount">Valor</label>
                <CurrencyInput
                    id="bill-amount"
                    value={amount}
                    className={errors.amount ? "input-error" : ""}
                    aria-invalid={Boolean(errors.amount)}
                    disabled={saving}
                    onChange={(digits) => {
                        setAmount(digits);
                        clearError("amount");
                    }}
                />
                {errors.amount && <span className="field-error">{errors.amount}</span>}

                <label htmlFor="bill-category">Categoria</label>
                <CategoryPicker
                    id="bill-category"
                    value={category}
                    categories={categories}
                    onChange={(value) => {
                        setCategory(value);
                        clearError("category");
                    }}
                    onCategoryCreated={onCategoryCreated}
                />
                {errors.category && <span className="field-error">{errors.category}</span>}

                <label htmlFor="bill-due-day">Dia do vencimento (opcional)</label>
                <input
                    autoComplete="off"
                    id="bill-due-day"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="Ex.: 10"
                    value={dueDay}
                    className={errors.due_day ? "input-error" : ""}
                    aria-invalid={Boolean(errors.due_day)}
                    disabled={saving}
                    onChange={(event) => {
                        setDueDay(event.target.value.replace(/\D/g, ""));
                        clearError("due_day");
                    }}
                />
                {errors.due_day && <span className="field-error">{errors.due_day}</span>}

                {formError && <p className="form-error" role="alert">{formError}</p>}

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
                        {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar conta"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default BillFormModal;
