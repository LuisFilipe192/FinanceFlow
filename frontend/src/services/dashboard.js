import { apiRequest } from "./api";

export function getSidebarSummary({ signal } = {}) {
    return apiRequest("/sidebar-summary/", {
        signal,
        fallbackError: "Erro ao buscar o resumo do mês.",
    });
}

export function getDashboard({ month, year, signal } = {}) {
    const params = new URLSearchParams();

    if (month) params.set("month", month);
    if (year) params.set("year", year);

    const queryString = params.toString();

    return apiRequest(`/dashboard/${queryString ? `?${queryString}` : ""}`, {
        signal,
        fallbackError: "Erro ao buscar dashboard.",
    });
}
