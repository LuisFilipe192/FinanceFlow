import { useContext } from "react";
import { createPortal } from "react-dom";

import { PageActionsContext } from "../context/PageActionsContext";

function PageActions({ children }) {
    const target = useContext(PageActionsContext);

    return target ? createPortal(children, target) : null;
}

export default PageActions;
