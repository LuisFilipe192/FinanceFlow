
const API_URL = "http://localhost:8000/api";

export async function getDashboard({ month, year, signal } = {}) {
    const params = new URLSearchParams();

    if (month) params.set("month", month);
    if (year) params.set("year", year);

    const queryString = params.toString();

    const url = `${API_URL}/dashboard/${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/json",
        },
        signal,
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Sessão expirada ou usuário não autenticado.");
        }

        throw new Error(
            `Erro ao buscar dashboard: ${response.status}`
        );
    }

    return response.json();
}
