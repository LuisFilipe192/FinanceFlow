import { useEffect, useState } from "react";

const DURATION = 450;

// Curva ease-out forte: começa rápido (resposta imediata) e assenta devagar.
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Quando `target` muda, o número exibido "corre" do valor antigo até o novo.
// Na primeira exibição (e com movimento reduzido) o valor aparece direto.
export function useCountUp(target) {
    const [animation, setAnimation] = useState({ from: target, to: target });
    const [value, setValue] = useState(target);

    // Ajuste durante a renderização (padrão recomendado pelo React para
    // reagir a mudança de prop): começa a nova animação a partir do valor
    // que está na tela agora.
    if (target !== animation.to) {
        setAnimation({ from: value, to: target });
    }

    useEffect(() => {
        const { from, to } = animation;
        let frame;

        if (from == null || to == null || from === to || prefersReducedMotion()) {
            frame = requestAnimationFrame(() => setValue(to));
            return () => cancelAnimationFrame(frame);
        }

        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / DURATION, 1);
            setValue(from + (to - from) * easeOutCubic(progress));

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        }

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [animation]);

    return value;
}
