import { MONTH_NAMES } from "./insights";
import { parseISODate } from "./format";

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 60;

export function isValidInstallmentCount(count) {
    return Number.isInteger(count) && count >= MIN_INSTALLMENTS && count <= MAX_INSTALLMENTS;
}

export function getLastInstallmentLabel(firstDate, count) {
    const start = parseISODate(firstDate);
    const last = new Date(start.getFullYear(), start.getMonth() + count - 1, 1);

    return `${MONTH_NAMES[last.getMonth()]} de ${last.getFullYear()}`;
}

export function hasFollowingInstallments(transaction) {
    return Boolean(transaction.installment_total)
        && transaction.installment_number < transaction.installment_total;
}
