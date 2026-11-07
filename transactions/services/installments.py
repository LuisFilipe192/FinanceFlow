import calendar
import uuid

from django.utils import timezone

from transactions.models import Transaction

MIN_INSTALLMENTS = 2
MAX_INSTALLMENTS = 60
LAST_SUPPORTED_YEAR = 2100


def add_months(start, months):
    index = start.month - 1 + months
    year = start.year + index // 12
    month = index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])

    return start.replace(year=year, month=month, day=day)


def ends_after_supported_year(start, installments):
    last_index = start.month - 1 + installments - 1

    return start.year + last_index // 12 > LAST_SUPPORTED_YEAR


def create_installments(installments, **fields):
    first_date = fields.pop("date", None) or timezone.localdate()
    group = uuid.uuid4()

    created = Transaction.objects.bulk_create([
        Transaction(
            **fields,
            date=add_months(first_date, number - 1),
            installment_group=group,
            installment_number=number,
            installment_total=installments,
        )
        for number in range(1, installments + 1)
    ])

    return created[0]
