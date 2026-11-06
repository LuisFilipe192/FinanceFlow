from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db.models import F
from django.utils import timezone

from transactions.models import FixedBill, Transaction


def get_due_date(bill, month, year):
    if bill.due_day is None:
        return None

    last_day = monthrange(year, month)[1]
    return date(year, month, min(bill.due_day, last_day))


def get_bill_status(payment, due_date, month, year, today):
    if payment is not None:
        return "paid"

    period = (year, month)
    current = (today.year, today.month)

    if period < current:
        return "overdue"

    if period > current or due_date is None:
        return "pending"

    if today > due_date:
        return "overdue"

    if today == due_date:
        return "due_today"

    return "pending"


def get_fixed_bills_for_period(user, month, year, today=None):
    today = today or timezone.localdate()

    payments = {}
    for payment in Transaction.objects.filter(
        user=user,
        fixed_bill__isnull=False,
        date__year=year,
        date__month=month,
    ).order_by("date", "id"):
        payments.setdefault(payment.fixed_bill_id, payment)

    bills = []
    summary = {
        "total": Decimal("0"),
        "paid_total": Decimal("0"),
        "pending_total": Decimal("0"),
        "pending_count": 0,
        "overdue_count": 0,
    }

    bills_by_due_day = FixedBill.objects.filter(user=user).select_related("category").order_by(
        F("due_day").asc(nulls_last=True),
        "description",
    )

    for bill in bills_by_due_day:
        payment = payments.get(bill.id)
        created = timezone.localdate(bill.created_at)

        if payment is None and (year, month) < (created.year, created.month):
            continue

        due_date = get_due_date(bill, month, year)
        status = get_bill_status(payment, due_date, month, year, today)

        bills.append({
            "bill": bill,
            "due_date": due_date,
            "status": status,
            "payment": payment,
        })

        summary["total"] += payment.amount if payment else bill.amount

        if payment:
            summary["paid_total"] += payment.amount
        else:
            summary["pending_total"] += bill.amount
            summary["pending_count"] += 1
            if status == "overdue":
                summary["overdue_count"] += 1

    return bills, summary
