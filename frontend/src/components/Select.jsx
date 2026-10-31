import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// options: [{ value, label }]. Os valores são comparados como texto, então
// tanto 3 quanto "3" selecionam a mesma opção.
//
// Teclado (mesmo padrão de um <select> nativo):
//   ↓ ↑ Enter Espaço  abrem a lista e navegam
//   Home / End        primeira / última opção
//   Enter / Espaço    escolhem a opção destacada
//   Esc / Tab         fecham sem mudar nada
function Select({ value, options, onChange, placeholder = "Selecione", className = "", id }) {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);
    const optionRefs = useRef([]);
    const listId = useId();

    const selectedIndex = options.findIndex(
        (option) => String(option.value) === String(value)
    );
    const selectedOption = options[selectedIndex];

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

    // Mantém a opção destacada visível ao navegar com as setas.
    useEffect(() => {
        if (open && activeIndex >= 0) {
            optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
        }
    }, [open, activeIndex]);

    function openList() {
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setOpen(true);
    }

    function choose(index) {
        onChange(options[index].value);
        setOpen(false);
    }

    function handleKeyDown(event) {
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                openList();
            }
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, options.length - 1));
                break;
            case "ArrowUp":
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
                break;
            case "Home":
                event.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                event.preventDefault();
                setActiveIndex(options.length - 1);
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                if (activeIndex >= 0) choose(activeIndex);
                break;
            case "Escape":
                // Fecha só a lista; sem isso o Esc também fecharia o modal.
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                break;
            case "Tab":
                setOpen(false);
                break;
            default:
                break;
        }
    }

    return (
        <div
            className={`category-dropdown ${className}`}
            ref={containerRef}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                id={id}
                className={`category-dropdown-trigger ${open ? "open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={
                    open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
                }
                onClick={() => (open ? setOpen(false) : openList())}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown size={18} />
            </button>

            {open && (
                <div className="category-dropdown-menu" role="listbox" id={listId}>
                    {options.map((option, index) => (
                        <div
                            key={option.value}
                            id={`${listId}-${index}`}
                            ref={(element) => {
                                optionRefs.current[index] = element;
                            }}
                            role="option"
                            aria-selected={index === selectedIndex}
                            className={[
                                "category-dropdown-option",
                                index === selectedIndex ? "selected" : "",
                                index === activeIndex ? "active" : "",
                            ].join(" ")}
                            onMouseEnter={() => setActiveIndex(index)}
                            // mousedown + preventDefault: escolhe sem tirar o
                            // foco do botão (o teclado continua funcionando).
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(index);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Select;
