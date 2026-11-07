import { formatDateToISO } from "./format";

export const STATEMENT_PRESETS = [
    { value: "this-month", label: "Este mês" },
    { value: "last-month", label: "Mês passado" },
    { value: "last-3-months", label: "Últimos 3 meses" },
    { value: "this-year", label: "Este ano" },
];

function range(start, end) {
    return { start: formatDateToISO(start), end: formatDateToISO(end) };
}

export function getPresetRange(preset, today = new Date()) {
    const year = today.getFullYear();
    const month = today.getMonth();

    if (preset === "last-month") {
        return range(new Date(year, month - 1, 1), new Date(year, month, 0));
    }

    if (preset === "last-3-months") {
        return range(new Date(year, month - 2, 1), new Date(year, month + 1, 0));
    }

    if (preset === "this-year") {
        return range(new Date(year, 0, 1), new Date(year, 11, 31));
    }

    return range(new Date(year, month, 1), new Date(year, month + 1, 0));
}
