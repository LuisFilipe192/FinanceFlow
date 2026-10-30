from django.db.models import Sum
from transactions.models import Transaction

from django.db.models import Sum, Q, F, Value, DecimalField
from django.db.models.functions import TruncMonth, Coalesce

def get_financial_summary(user, month=None, year=None):
    transactions = Transaction.objects.filter(user=user)

    if month is not None:
        transactions = transactions.filter(date__month=month)

    if year is not None:
        transactions = transactions.filter(date__year=year)

    income = transactions.filter(
        type=Transaction.Type.INCOME
    ).aggregate(total=Sum("amount"))["total"] or 0

    expenses = transactions.filter(
        type=Transaction.Type.EXPENSE
    ).aggregate(total=Sum("amount"))["total"] or 0

    balance = income - expenses

    return {
        "income": income,
        "expenses": expenses,
        "balance": balance,
    }

def get_expenses_by_category(user, month=None, year=None):
    transactions = Transaction.objects.filter(
        user=user,
        type=Transaction.Type.EXPENSE
    )

    if month is not None:
        transactions = transactions.filter(date__month=month)

    if year is not None:
        transactions = transactions.filter(date__year=year)

    expenses = transactions.values(
        "category__name"
    ).annotate(
        total=Sum("amount")
    ).order_by("-total")

    return expenses

def get_monthly_financial_history(user, year):
    transactions = Transaction.objects.filter(
        user=user,
        date__year=year
    )

    history = transactions.annotate(
        month=TruncMonth("date")
    ).values(
        "month"
    ).annotate(
        income=Coalesce(
            Sum(
                "amount",
                filter=Q(type=Transaction.Type.INCOME)
            ),
            Value(0),
            output_field=DecimalField(max_digits=12, decimal_places=2)
        ),
        expenses=Coalesce(
            Sum(
                "amount",
                filter=Q(type=Transaction.Type.EXPENSE)
            ),
            Value(0),
            output_field=DecimalField(max_digits=12, decimal_places=2)
        )
    ).annotate(
        balance=F("income") - F("expenses")
    ).order_by("month")

    return history