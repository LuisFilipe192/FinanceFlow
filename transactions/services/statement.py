import csv
import io
from decimal import Decimal

from django.db.models import Q, Sum

from transactions.models import Transaction

CSV_HEADER = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Parcela"]
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def get_statement(user, start, end, transaction_type=None):
    transactions = Transaction.objects.filter(
        user=user,
        date__range=(start, end),
    ).select_related("category").order_by("date", "id")

    if transaction_type:
        transactions = transactions.filter(type=transaction_type)

    return transactions


def summarize_statement(transactions):
    totals = transactions.aggregate(
        income=Sum("amount", filter=Q(type=Transaction.Type.INCOME)),
        expenses=Sum("amount", filter=Q(type=Transaction.Type.EXPENSE)),
    )
    income = totals["income"] or Decimal("0")
    expenses = totals["expenses"] or Decimal("0")

    return {"income": income, "expenses": expenses, "balance": income - expenses}


def safe_cell(text):
    if text.startswith(FORMULA_PREFIXES):
        return f"'{text}"

    return text


def _signed_amount(transaction):
    sign = "-" if transaction.type == Transaction.Type.EXPENSE else ""

    return f"{sign}{transaction.amount:.2f}".replace(".", ",")


def _installment_label(transaction):
    if not transaction.installment_total:
        return ""

    return f"{transaction.installment_number} de {transaction.installment_total}"


def build_statement_csv(transactions):
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", lineterminator="\r\n")
    writer.writerow(CSV_HEADER)

    for transaction in transactions:
        writer.writerow([
            transaction.date.strftime("%d/%m/%Y"),
            safe_cell(transaction.description),
            safe_cell(transaction.category.name) if transaction.category else "",
            transaction.get_type_display(),
            _signed_amount(transaction),
            _installment_label(transaction),
        ])

    return "﻿" + output.getvalue()
