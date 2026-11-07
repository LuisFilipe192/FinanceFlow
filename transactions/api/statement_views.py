from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from transactions.services.statement import (
    build_statement_csv,
    get_statement,
    summarize_statement,
)

from .serializers import (
    FinancialSummarySerializer,
    StatementFilterSerializer,
    TransactionSerializer,
)


def _filtered_statement(request):
    serializer = StatementFilterSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    filters = serializer.validated_data

    transactions = get_statement(
        request.user,
        filters["start"],
        filters["end"],
        filters.get("type"),
    )

    return transactions, filters


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def statement_api(request):
    transactions, _ = _filtered_statement(request)

    return Response({
        "summary": FinancialSummarySerializer(summarize_statement(transactions)).data,
        "transactions": TransactionSerializer(transactions, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def statement_export_api(request):
    transactions, filters = _filtered_statement(request)
    filename = f"extrato_{filters['start']}_{filters['end']}.csv"

    response = HttpResponse(
        build_statement_csv(transactions),
        content_type="text/csv; charset=utf-8",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["X-Content-Type-Options"] = "nosniff"
    response["Cache-Control"] = "no-store"

    return response
