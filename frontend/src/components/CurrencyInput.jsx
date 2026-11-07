import { centsToNumber, formatCurrency } from "../utils/format";

// O valor é guardado como dígitos em centavos ("125000" = R$ 1.250,00), como
// nos apps de banco: cada número digitado entra pela direita. 10 dígitos é o
// limite do campo no banco (max_digits=10, decimal_places=2).
const MAX_AMOUNT_DIGITS = 10;

function CurrencyInput({ value, onChange, className = "", ...props }) {
    return (
        <input
            autoComplete="off"
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            {...props}
            className={className}
            value={value ? formatCurrency(centsToNumber(value)) : ""}
            onChange={(event) => {
                // Fica só com os dígitos: letras e símbolos nem entram.
                const digits = event.target.value
                    .replace(/\D/g, "")
                    .replace(/^0+/, "")
                    .slice(0, MAX_AMOUNT_DIGITS);

                onChange(digits);
            }}
        />
    );
}

export default CurrencyInput;
