from decimal import Decimal
from datetime import date
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import UserManager
from django.db import IntegrityError

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


class RegisterIntegrityErrorTests(TestCase):

    url = "/api/auth/register/"
    payload = {
        "username": "novousuario",
        "password": "SenhaForte!2026",
        "password_confirmation": "SenhaForte!2026",
    }

    def test_race_on_username_returns_400(self):
        # Simula outro cadastro com o mesmo nome entre a validação e o INSERT:
        # o INSERT falha e, ao conferir de novo, o nome já existe.
        duplicate = IntegrityError("UNIQUE constraint failed: auth_user.username")

        with patch.object(UserManager, "create_user", side_effect=duplicate), \
                patch("django.db.models.query.QuerySet.exists", side_effect=[False, True]):
            response = self.client.post(
                self.url, self.payload, content_type="application/json"
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.json()["errors"])

    def test_unexpected_integrity_error_is_not_hidden(self):
        with patch.object(UserManager, "create_user", side_effect=IntegrityError("outra falha")):
            with self.assertRaises(IntegrityError):
                self.client.post(
                    self.url, self.payload, content_type="application/json"
                )


class CategoryNameValidationTests(TestCase):

    url = "/api/categories/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="usuario1",
            password="teste123"
        )
        self.client.force_login(self.user)

    def create(self, name):
        return self.client.post(
            self.url, {"name": name}, content_type="application/json"
        )

    def test_accepts_accents_and_spaces(self):
        for name in ["Alimentação", "Contas da casa", "Saúde"]:
            with self.subTest(name=name):
                self.assertEqual(self.create(name).status_code, 201)

    def test_collapses_repeated_spaces(self):
        response = self.create("  Lazer   e  viagens ")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["name"], "Lazer e viagens")

    def test_rejects_digits_and_symbols(self):
        for name in ["Casa1", "Casa_nova", "Casa!", "   "]:
            with self.subTest(name=name):
                self.assertEqual(self.create(name).status_code, 400)

    def test_rejects_missing_name(self):
        response = self.client.post(
            self.url, {"name": None}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)


class CategoryEditTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="usuario1",
            password="teste123"
        )
        self.other_user = User.objects.create_user(
            username="usuario2",
            password="teste123"
        )
        self.client.force_login(self.user)

        self.category = Category.objects.create(name="Lazer", user=self.user)
        Category.objects.create(name="Mercado", user=self.user)

    def rename(self, category, name):
        return self.client.patch(
            f"/api/categories/{category.id}/",
            {"name": name},
            content_type="application/json",
        )

    def test_rename_category(self):
        response = self.rename(self.category, "  Viagens   e passeios ")

        self.assertEqual(response.status_code, 200)
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "Viagens e passeios")

    def test_rename_keeps_transactions_linked(self):
        transaction = Transaction.objects.create(
            description="Cinema",
            amount=Decimal("40.00"),
            type=Transaction.Type.EXPENSE,
            category=self.category,
            user=self.user,
        )

        self.rename(self.category, "Cultura")

        transaction.refresh_from_db()
        self.assertEqual(transaction.category.name, "Cultura")

    def test_rename_only_changing_case(self):
        response = self.rename(self.category, "LAZER")

        self.assertEqual(response.status_code, 200)

    def test_rename_to_existing_name_is_rejected(self):
        response = self.rename(self.category, "mercado")

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json())

    def test_cannot_rename_other_users_category(self):
        other_category = Category.objects.create(name="Saúde", user=self.other_user)

        response = self.rename(other_category, "Invadida")

        self.assertEqual(response.status_code, 404)
        other_category.refresh_from_db()
        self.assertEqual(other_category.name, "Saúde")

    def test_default_category_cannot_be_renamed_or_deleted(self):
        default = Category.objects.create(name="Transferências", user=self.user)

        self.assertEqual(self.rename(default, "Outra").status_code, 400)

        response = self.client.delete(
            "/api/categories/",
            {"id": default.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Category.objects.filter(id=default.id).exists())


class UserIsolationTests(TestCase):
    """O usuário logado (Ana) tenta ler e alterar os dados de outra pessoa (Bruno).

    Todas as tentativas precisam falhar sem revelar nem modificar nada.
    Respostas 404 (e não 403) são de propósito: não confirmam que o registro existe.
    """

    def setUp(self):
        self.ana = User.objects.create_user(username="ana", password="teste123")
        self.bruno = User.objects.create_user(username="bruno", password="teste123")

        self.ana_category = Category.objects.create(name="Mercado", user=self.ana)
        self.bruno_category = Category.objects.create(name="Viagem", user=self.bruno)

        self.ana_transaction = Transaction.objects.create(
            description="Compra da Ana",
            amount=Decimal("50.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=self.ana_category,
            user=self.ana,
        )
        self.bruno_transaction = Transaction.objects.create(
            description="Passagem do Bruno",
            amount=Decimal("900.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 12),
            category=self.bruno_category,
            user=self.bruno,
        )

        self.client.force_login(self.ana)

    # Leitura

    def test_transaction_list_only_shows_own(self):
        response = self.client.get("/api/transactions/")

        descriptions = [item["description"] for item in response.json()]
        self.assertEqual(descriptions, ["Compra da Ana"])

    def test_category_list_only_shows_own(self):
        response = self.client.get("/api/categories/")

        names = {item["name"] for item in response.json()}
        self.assertIn("Mercado", names)
        self.assertNotIn("Viagem", names)

    def test_dashboard_only_counts_own(self):
        response = self.client.get("/api/dashboard/?month=10&year=2026")

        summary = response.json()["summary"]
        self.assertEqual(Decimal(summary["expenses"]), Decimal("50.00"))

        categories = [item["category"] for item in response.json()["expenses_by_category"]]
        self.assertNotIn("Viagem", categories)

    # Alteração de transação alheia

    def test_cannot_edit_other_users_transaction(self):
        response = self.client.patch(
            f"/api/transactions/{self.bruno_transaction.id}/",
            {"description": "Alterada pela Ana"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.bruno_transaction.refresh_from_db()
        self.assertEqual(self.bruno_transaction.description, "Passagem do Bruno")

    def test_cannot_delete_other_users_transaction(self):
        response = self.client.delete(f"/api/transactions/{self.bruno_transaction.id}/")

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Transaction.objects.filter(id=self.bruno_transaction.id).exists())

    # Uso de categoria alheia

    def test_cannot_create_transaction_with_other_users_category(self):
        response = self.client.post(
            "/api/transactions/",
            {
                "description": "Tentativa",
                "amount": "10.00",
                "type": "EXPENSE",
                "date": "2026-10-15",
                "category": self.bruno_category.id,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("category", response.json())

    def test_cannot_move_own_transaction_to_other_users_category(self):
        response = self.client.patch(
            f"/api/transactions/{self.ana_transaction.id}/",
            {"category": self.bruno_category.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.ana_transaction.refresh_from_db()
        self.assertEqual(self.ana_transaction.category, self.ana_category)

    def test_cannot_delete_other_users_category(self):
        response = self.client.delete(
            "/api/categories/",
            {"id": self.bruno_category.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Category.objects.filter(id=self.bruno_category.id).exists())

    # Dono definido pelo servidor, nunca pelo cliente

    def test_user_field_in_request_is_ignored(self):
        response = self.client.post(
            "/api/transactions/",
            {
                "description": "Tentando criar no nome do Bruno",
                "amount": "10.00",
                "type": "EXPENSE",
                "date": "2026-10-15",
                "category": self.ana_category.id,
                "user": self.bruno.id,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        created = Transaction.objects.get(id=response.json()["id"])
        self.assertEqual(created.user, self.ana)


class TransactionAmountValidationTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="teste123")
        self.client.force_login(self.user)

        self.transaction = Transaction.objects.create(
            description="Mercado",
            amount=Decimal("50.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            user=self.user,
        )

    def create(self, amount):
        return self.client.post(
            "/api/transactions/",
            {
                "description": "Teste",
                "amount": amount,
                "type": "EXPENSE",
                "date": "2026-10-15",
            },
            content_type="application/json",
        )

    def test_rejects_zero_and_negative_amounts(self):
        for amount in ["0", "0.00", "-50.00"]:
            with self.subTest(amount=amount):
                response = self.create(amount)

                self.assertEqual(response.status_code, 400)
                self.assertIn("amount", response.json())

    def test_accepts_smallest_positive_amount(self):
        self.assertEqual(self.create("0.01").status_code, 201)

    def test_edit_cannot_set_negative_amount(self):
        response = self.client.patch(
            f"/api/transactions/{self.transaction.id}/",
            {"amount": "-10.00"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.transaction.refresh_from_db()
        self.assertEqual(self.transaction.amount, Decimal("50.00"))


class AnonymousAccessTests(TestCase):
    """Sem login, nenhuma rota de dados responde com conteúdo."""

    def test_private_endpoints_require_login(self):
        endpoints = [
            ("get", "/api/transactions/"),
            ("post", "/api/transactions/"),
            ("patch", "/api/transactions/1/"),
            ("delete", "/api/transactions/1/"),
            ("get", "/api/categories/"),
            ("post", "/api/categories/"),
            ("patch", "/api/categories/1/"),
            ("get", "/api/dashboard/"),
        ]

        for method, url in endpoints:
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(url)
                self.assertIn(response.status_code, (401, 403))
