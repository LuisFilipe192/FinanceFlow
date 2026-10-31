export function formatCurrency(value) {
    return Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

// "2026-10-31" -> Date à meia-noite no fuso local. new Date("2026-10-31")
// sozinho seria interpretado como UTC e, no Brasil, viraria o dia 30.
export function parseISODate(isoDate) {
    return new Date(`${isoDate}T00:00:00`);
}

// "2026-10-31" -> "31/10/2026"
export function formatDate(isoDate) {
    return parseISODate(isoDate).toLocaleDateString("pt-BR");
}

// Usa o fuso local do navegador. toISOString() converte para UTC e,
// no Brasil, depois das 21h já retornaria a data do dia seguinte.
export function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
