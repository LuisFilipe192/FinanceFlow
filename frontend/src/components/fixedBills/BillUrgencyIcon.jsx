import { AlertTriangle, CircleCheck, CircleDashed, Clock } from "lucide-react";

const URGENCY_ICONS = {
    paid: CircleCheck,
    calm: CircleDashed,
    soon: CircleDashed,
    urgent: Clock,
    overdue: AlertTriangle,
};

function BillUrgencyIcon({ urgency, ...props }) {
    const Icon = URGENCY_ICONS[urgency];

    return <Icon {...props} />;
}

export default BillUrgencyIcon;
