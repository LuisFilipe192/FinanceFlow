import { formatDate, formatDateToISO, parseISODate } from "./format";

function shortDate(isoDate) {
    return formatDate(isoDate).slice(0, 5);
}

export function getBillStatusLabel(bill) {
    if (bill.status === "paid") return `Paga em ${shortDate(bill.payment.date)}`;
    if (bill.status === "due_today") return "Vence hoje";

    if (bill.status === "overdue") {
        return bill.due_date ? `Atrasada desde ${shortDate(bill.due_date)}` : "Não paga no mês";
    }

    return bill.due_date ? `Vence dia ${parseISODate(bill.due_date).getDate()}` : "Sem vencimento";
}

export function getDefaultPaymentDate(bill, period, today = new Date()) {
    const isCurrentMonth =
        period.month === today.getMonth() + 1 && period.year === today.getFullYear();

    if (isCurrentMonth) return formatDateToISO(today);
    if (bill.due_date) return bill.due_date;

    return formatDateToISO(new Date(period.year, period.month - 1, 1));
}
