import { apiRequest } from "./api";

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
