from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from transactions.models import FixedBill, Transaction
from transactions.services.dashboard import get_financial_summary
from transactions.services.fixed_bills import get_fixed_bills_for_period

from .serializers import (
    DashboardPeriodSerializer,
    FinancialSummarySerializer,
    FixedBillPaymentSerializer,
    FixedBillSerializer,
    TransactionSerializer,
)

MONTH_NAMES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def _bill_data(entry, request):
    bill = entry["bill"]
    payment = entry["payment"]

    return {
        **FixedBillSerializer(bill, context={"request": request}).data,
        "status": entry["status"],
        "due_date": entry["due_date"],
        "payment": (
            {
                "id": payment.id,
                "amount": str(payment.amount),
                "date": payment.date,
            }
            if payment
            else None
        ),
    }


def _get_bill(request, pk):
    return FixedBill.objects.filter(id=pk, user=request.user).first()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sidebar_summary_api(request):
    today = timezone.localdate()
    summary = get_financial_summary(request.user, today.month, today.year)
    entries, _ = get_fixed_bills_for_period(request.user, today.month, today.year, today)

    return Response({
        "period": {"month": today.month, "year": today.year},
        "summary": FinancialSummarySerializer(summary).data,
        "bills": [_bill_data(entry, request) for entry in entries],
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def fixed_bills_api(request):
    if request.method == "POST":
        serializer = FixedBillSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    today = timezone.localdate()
    period_serializer = DashboardPeriodSerializer(data=request.query_params)
    period_serializer.is_valid(raise_exception=True)
    month = period_serializer.validated_data.get("month", today.month)
    year = period_serializer.validated_data.get("year", today.year)

    entries, summary = get_fixed_bills_for_period(request.user, month, year, today)

    return Response({
        "period": {"month": month, "year": year},
        "summary": {key: str(value) if not isinstance(value, int) else value for key, value in summary.items()},
        "bills": [_bill_data(entry, request) for entry in entries],
    })


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def fixed_bill_detail_api(request, pk):
    bill = _get_bill(request, pk)

    if bill is None:
        return Response({"error": "Conta não encontrada."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        bill.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = FixedBillSerializer(
        bill,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fixed_bill_pay_api(request, pk):
    bill = _get_bill(request, pk)

    if bill is None:
        return Response({"error": "Conta não encontrada."}, status=status.HTTP_404_NOT_FOUND)

    payment_serializer = FixedBillPaymentSerializer(data=request.data)

    if not payment_serializer.is_valid():
        return Response(payment_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    amount = payment_serializer.validated_data.get("amount", bill.amount)
    paid_on = payment_serializer.validated_data.get("date", timezone.localdate())

    already_paid = Transaction.objects.filter(
        user=request.user,
        fixed_bill=bill,
        date__year=paid_on.year,
        date__month=paid_on.month,
    ).exists()

    if already_paid:
        return Response(
            {"detail": f"{bill.description} já foi paga em {MONTH_NAMES[paid_on.month - 1]}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    transaction_serializer = TransactionSerializer(
        data={
            "description": bill.description,
            "amount": amount,
            "type": Transaction.Type.EXPENSE,
            "date": paid_on,
            "category": bill.category_id,
        },
        context={"request": request},
    )
    transaction_serializer.is_valid(raise_exception=True)
    transaction_serializer.save(user=request.user, fixed_bill=bill)

    return Response(transaction_serializer.data, status=status.HTTP_201_CREATED)
