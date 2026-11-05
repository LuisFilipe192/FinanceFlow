import re
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from django.db import transaction

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

from django.views.decorators.csrf import ensure_csrf_cookie

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

# Categoria padrão: recebe as transações de categorias excluídas. Ela é
# localizada pelo nome, por isso não pode ser renomeada nem excluída.
DEFAULT_CATEGORY_NAME = "Transferências"


def _clean_category_name(raw_name, user, exclude_id=None):
    """Normaliza e valida o nome de uma categoria. Retorna (nome, erro)."""
    # Junta espaços repetidos: "Contas   da casa" vira "Contas da casa".
    name = " ".join(raw_name.split()) if isinstance(raw_name, str) else ""

    if not name:
        return None, "Informe o nome da categoria."

    if len(name) > 100:
        return None, "Use no máximo 100 caracteres."

    # [^\W\d_] = qualquer letra Unicode (inclui acentos e ç), sem dígitos nem "_".
    if not re.fullmatch(r"[^\W\d_]+(?: [^\W\d_]+)*", name):
        return None, "Use apenas letras e espaços."

    duplicates = Category.objects.filter(user=user, name__iexact=name)

    # Na edição, a própria categoria não conta como duplicada
    # (permite trocar "lazer" por "Lazer").
    if exclude_id is not None:
        duplicates = duplicates.exclude(id=exclude_id)

    if duplicates.exists():
        return None, "Essa categoria já está cadastrada."

    return name, None


MAX_BUDGET = Decimal("99999999.99")


def _clean_budget(raw_budget):
    if raw_budget is None or raw_budget == "":
        return None, None

    if isinstance(raw_budget, bool):
        return None, "Informe um valor válido."

    try:
        budget = Decimal(str(raw_budget)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None, "Informe um valor válido."

    if not budget.is_finite() or budget <= 0:
        return None, "O orçamento precisa ser maior que zero."

    if budget > MAX_BUDGET:
        return None, "Use um valor menor."

    return budget, None


def _category_data(category):
    return {
        "id": category.id,
        "name": category.name,
        "monthly_budget": (
            str(category.monthly_budget)
            if category.monthly_budget is not None
            else None
        ),
    }


@ensure_csrf_cookie
@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def categories_api(request):
    if request.method == "GET":
        categories = Category.objects.filter(
            user=request.user
        ).order_by("name")

        Category.objects.get_or_create(
            user=request.user,
            name=DEFAULT_CATEGORY_NAME
        )

        data = [_category_data(category) for category in categories]

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

        if category.name == DEFAULT_CATEGORY_NAME:
            return Response(
                {"error": "A categoria Transferências é padrão e não pode ser excluída."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            transfer_category, created = Category.objects.get_or_create(
                user=request.user,
                name=DEFAULT_CATEGORY_NAME
            )

            Transaction.objects.filter(
                user=request.user,
                category=category
            ).update(category=transfer_category)

            category.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    name, error = _clean_category_name(request.data.get("name"), request.user)
    budget, budget_error = _clean_budget(request.data.get("monthly_budget"))

    errors = {}
    if error:
        errors["name"] = error
    if budget_error:
        errors["monthly_budget"] = budget_error

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    category = Category.objects.create(
        name=name,
        monthly_budget=budget,
        user=request.user
    )

    return Response(
        _category_data(category),
        status=status.HTTP_201_CREATED
    )

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def category_detail_api(request, pk):
    try:
        category = Category.objects.get(
            id=pk,
            user=request.user
        )
    except Category.DoesNotExist:
        return Response(
            {"error": "Categoria não encontrada."},
            status=status.HTTP_404_NOT_FOUND
        )

    if category.name == DEFAULT_CATEGORY_NAME:
        return Response(
            {"name": "A categoria Transferências é padrão e não pode ser renomeada."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if "name" not in request.data and "monthly_budget" not in request.data:
        return Response(
            {"name": "Envie o nome ou o orçamento para alterar."},
            status=status.HTTP_400_BAD_REQUEST
        )

    errors = {}
    update_fields = []

    if "name" in request.data:
        name, error = _clean_category_name(
            request.data.get("name"),
            request.user,
            exclude_id=category.id
        )

        if error:
            errors["name"] = error
        else:
            category.name = name
            update_fields.append("name")

    if "monthly_budget" in request.data:
        budget, budget_error = _clean_budget(request.data.get("monthly_budget"))

        if budget_error:
            errors["monthly_budget"] = budget_error
        else:
            category.monthly_budget = budget
            update_fields.append("monthly_budget")

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    category.save(update_fields=update_fields)

    return Response(_category_data(category))

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def transaction_detail_api(request, pk):

    try:
        transaction = Transaction.objects.get(
            id=pk,
            user=request.user
        )
    except Transaction.DoesNotExist:
        return Response(
            {"error": "Transação não encontrada."},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "PATCH":
        serializer = TransactionSerializer(
            transaction,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == "DELETE":
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
