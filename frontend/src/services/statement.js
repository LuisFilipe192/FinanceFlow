import { apiRequest } from "./api";

function toQueryString({ start, end, type }) {
    const params = new URLSearchParams({ start, end });

    if (type !== "ALL") params.set("type", type);

    return params.toString();
}

export function getStatement(filters, { signal } = {}) {
    return apiRequest(`/statement/?${toQueryString(filters)}`, {
        signal,
        fallbackError: "Não foi possível carregar o extrato.",
    });
}

export async function downloadStatementCsv(filters) {
    const blob = await apiRequest(`/statement/export/?${toQueryString(filters)}`, {
        asBlob: true,
        fallbackError: "Não foi possível exportar o extrato.",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `extrato_${filters.start}_${filters.end}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}
