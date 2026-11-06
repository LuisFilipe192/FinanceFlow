import { apiRequest } from "./api";

export function getFixedBills({ month, year, signal } = {}) {
    const params = new URLSearchParams();

    if (month) params.set("month", month);
    if (year) params.set("year", year);

    const queryString = params.toString();

    return apiRequest(`/fixed-bills/${queryString ? `?${queryString}` : ""}`, {
        signal,
        fallbackError: "Erro ao buscar as contas fixas.",
    });
}

export function createFixedBill(bill) {
    return apiRequest("/fixed-bills/", {
        method: "POST",
        body: bill,
        fallbackError: "Não foi possível cadastrar a conta.",
    });
}

export function updateFixedBill(id, changes) {
    return apiRequest(`/fixed-bills/${id}/`, {
        method: "PATCH",
        body: changes,
        fallbackError: "Não foi possível salvar a conta.",
    });
}

export function deleteFixedBill(id) {
    return apiRequest(`/fixed-bills/${id}/`, {
        method: "DELETE",
        fallbackError: "Não foi possível excluir a conta.",
    });
}

export function payFixedBill(id, payment) {
    return apiRequest(`/fixed-bills/${id}/pay/`, {
        method: "POST",
        body: payment,
        fallbackError: "Não foi possível registrar o pagamento.",
    });
}
