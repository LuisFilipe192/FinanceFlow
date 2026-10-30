from decimal import Decimal
from datetime import date

from django.test import TestCase
from django.contrib.auth import get_user_model

from transactions.models import Transaction, Category
from transactions.services.dashboard import (
    get_financial_summary,
    get_expenses_by_category,
    get_monthly_financial_history,
)

User = get_user_model()


class DashboardServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="usuario1",
            password="teste123"
        )

        self.other_user = User.objects.create_user(
            username="usuario2",
            password="teste123"
        )

        self.category = Category.objects.create(
            name="Alimentação",
            user=self.user
        )

        self.other_category = Category.objects.create(
            name="Transporte",
            user=self.other_user
        )

    def test_financial_summary(self):
        Transaction.objects.create(
            description="Salário",
            amount=Decimal("3000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.user,
        )

        Transaction.objects.create(
            description="Almoço",
            amount=Decimal("500.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=self.category,
            user=self.user,
        )

        summary = get_financial_summary(self.user)

        self.assertEqual(summary["income"], Decimal("3000.00"))
        self.assertEqual(summary["expenses"], Decimal("500.00"))
        self.assertEqual(summary["balance"], Decimal("2500.00"))

    def test_financial_summary_only_own_transactions(self):
        Transaction.objects.create(
            description="Salário usuário 1",
            amount=Decimal("3000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.user,
        )

        Transaction.objects.create(
            description="Salário usuário 2",
            amount=Decimal("5000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.other_user,
        )

        summary = get_financial_summary(self.user)

        self.assertEqual(summary["income"], Decimal("3000.00"))
        self.assertEqual(summary["expenses"], Decimal("0"))
        self.assertEqual(summary["balance"], Decimal("3000.00"))

    def test_expenses_by_category(self):
        Transaction.objects.create(
            description="Almoço",
            amount=Decimal("35.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 5),
            category=self.category,
            user=self.user,
        )

        Transaction.objects.create(
            description="Jantar",
            amount=Decimal("45.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=self.category,
            user=self.user,
        )

        expenses = get_expenses_by_category(self.user)

        self.assertEqual(len(expenses), 1)
        self.assertEqual(expenses[0]["category__name"], "Alimentação")
        self.assertEqual(expenses[0]["total"], Decimal("80.00"))

    def test_monthly_financial_history(self):
        Transaction.objects.create(
            description="Salário",
            amount=Decimal("3000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.user,
        )

        Transaction.objects.create(
            description="Almoço",
            amount=Decimal("500.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=self.category,
            user=self.user,
        )

        history = get_monthly_financial_history(self.user, 2026)

        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["income"], Decimal("3000.00"))
        self.assertEqual(history[0]["expenses"], Decimal("500.00"))
        self.assertEqual(history[0]["balance"], Decimal("2500.00"))

    def test_monthly_history_only_own_transactions(self):
        Transaction.objects.create(
            description="Salário usuário 1",
            amount=Decimal("3000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.user,
        )

        Transaction.objects.create(
            description="Salário usuário 2",
            amount=Decimal("5000.00"),
            type=Transaction.Type.INCOME,
            date=date(2026, 10, 5),
            user=self.other_user,
        )

        history = get_monthly_financial_history(self.user, 2026)

        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["income"], Decimal("3000.00"))
        self.assertEqual(history[0]["expenses"], Decimal("0"))
        self.assertEqual(history[0]["balance"], Decimal("3000.00"))

    def test_expenses_by_category_only_own_transactions(self):
        Transaction.objects.create(
            description="Almoço usuário 1",
            amount=Decimal("35.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 5),
            category=self.category,
            user=self.user,
        )

        Transaction.objects.create(
            description="Transporte usuário 2",
            amount=Decimal("50.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 5),
            category=self.other_category,
            user=self.other_user,
        )

        expenses = get_expenses_by_category(self.user)

        self.assertEqual(len(expenses), 1)
        self.assertEqual(expenses[0]["category__name"], "Alimentação")
        self.assertEqual(expenses[0]["total"], Decimal("35.00"))
