import re

from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from transactions.models import Transaction, Category

from transactions.services.dashboard import (
    get_financial_summary,
    get_expenses_by_category,
    get_daily_financial_movement,
)

from .serializers import (
    FinancialSummarySerializer,
    CategoryExpenseSerializer,
    DailyMovementSerializer,
    DashboardPeriodSerializer,
    TransactionSerializer,
)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_api(request):

    today = timezone.localdate()

    period_serializer = DashboardPeriodSerializer(
        data=request.query_params
    )
    period_serializer.is_valid(raise_exception=True)

    month = period_serializer.validated_data.get(
        "month", today.month
    )

    year = period_serializer.validated_data.get(
        "year", today.year
    )

    user = request.user

    summary = get_financial_summary(user, month, year)

    expenses_by_category = get_expenses_by_category(
        user, month, year
    )

    daily_movement = get_daily_financial_movement(
        user, month, year
    )

    summary_data = FinancialSummarySerializer(summary).data

    categories_data = CategoryExpenseSerializer(
        expenses_by_category,
        many=True
    ).data

    daily_data = DailyMovementSerializer(
        daily_movement,
        many=True
    ).data

    return Response({
        "period": {
            "month": month,
            "year": year,
        },
        "summary": summary_data,
        "daily_movement": daily_data,
        "expenses_by_category": categories_data,
    })

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def transactions_api(request):

    if request.method == "GET":
        transactions = Transaction.objects.filter(
            user=request.user
        ).select_related("category").order_by("-date", "-id")

        serializer = TransactionSerializer(
            transactions,
            many=True
        )

        return Response(serializer.data)

    serializer = TransactionSerializer(
        data=request.data,
        context={"request": request}
    )

    if serializer.is_valid():
        serializer.save(user=request.user)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def categories_api(request):
    if request.method == "GET":
        categories = Category.objects.filter(
            user=request.user
        ).order_by("name")

        data = [
            {"id": category.id, "name": category.name}
            for category in categories
        ]

        return Response(data)

    if request.method == "DELETE":
        category_id = request.data.get("id")

        try:
            category = Category.objects.get(
                id=category_id,
                user=request.user
            )
        except Category.DoesNotExist:
            return Response(
                {"error": "Categoria não encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            category.delete()
        except Exception:
            return Response(
                {"error": "Não é possível excluir uma categoria vinculada a transações."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

    name = request.data.get("name", "").strip()

    if not name:
        return Response(
            {"name": "Informe o nome da categoria."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(name) > 100:
        return Response(
            {"name": "Use no máximo 100 caracteres."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not re.fullmatch(r"[a-zA-Z]+", name):
        return Response(
            {"name": "Use apenas letras, sem espaços, números ou caracteres especiais."},
            status=status.HTTP_400_BAD_REQUEST
        )

    already_exists = Category.objects.filter(
        user=request.user,
        name__iexact=name
    ).exists()

    if already_exists:
        return Response(
            {"name": "Essa categoria já está cadastrada."},
            status=status.HTTP_400_BAD_REQUEST
        )

    category = Category.objects.create(
        name=name,
        user=request.user
    )

    return Response(
        {"id": category.id, "name": category.name},
        status=status.HTTP_201_CREATED
    )
