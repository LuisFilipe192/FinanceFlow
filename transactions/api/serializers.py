from rest_framework import serializers
from transactions.models import Transaction, Category

class FinancialSummarySerializer(serializers.Serializer):
    income = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    expenses = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )


class CategoryExpenseSerializer(serializers.Serializer):
    category = serializers.CharField(
        source="category__name",
        allow_null=True
    )

    total = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )


class MonthlyHistorySerializer(serializers.Serializer):
    month = serializers.DateField()

    income = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    expenses = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

class DailyMovementSerializer(serializers.Serializer):
    day = serializers.IntegerField()

    income = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    expenses = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )


class DashboardPeriodSerializer(serializers.Serializer):
    month = serializers.IntegerField(
        min_value=1,
        max_value=12,
        required=False
    )

    year = serializers.IntegerField(
        min_value=2000,
        max_value=2100,
        required=False
    )

class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    class Meta:
        model = Transaction
        fields = [
            "id",
            "description",
            "amount",
            "type",
            "date",
            "category",
            "category_name",
        ]
        read_only_fields = ["id", "category_name"]

    def validate_category(self, category):
        if category is not None:
            user = self.context["request"].user

            if category.user != user:
                raise serializers.ValidationError(
                    "Categoria inválida."
                )

        return category

