import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// options: [{ value, label }]. Os valores são comparados como texto, então
// tanto 3 quanto "3" selecionam a mesma opção.
function Select({ value, options, onChange, placeholder = "Selecione", className = "" }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        function handleClickOutside(event) {
            if (!containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const selectedOption = options.find(
        (option) => String(option.value) === String(value)
    );

    return (
        <div className={`category-dropdown ${className}`} ref={containerRef}>
            <button
                type="button"
                className={`category-dropdown-trigger ${open ? "open" : ""}`}
                onClick={() => setOpen(!open)}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown size={18} />
            </button>

            {open && (
                <div className="category-dropdown-menu">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            className={`category-dropdown-option ${
                                option === selectedOption ? "selected" : ""
                            }`}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Select;
