import json
import os
import subprocess
import sys
from decimal import Decimal
from datetime import date, datetime, timezone as dt_timezone
from unittest.mock import patch

from django.test import Client, TestCase, override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import UserManager
from django.core import mail
from django.core.cache import cache
from django.db import IntegrityError
from django.db.models import RestrictedError
from rest_framework.throttling import UserRateThrottle

from transactions.models import Transaction, Category, FixedBill
from transactions.services.fixed_bills import get_due_date, get_fixed_bills_for_period
from transactions.services.installments import add_months
from transactions.services.statement import safe_cell
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
        "email": "novo@example.com",
        "password": "SenhaForte!2026",
        "password_confirmation": "SenhaForte!2026",
    }

    def setUp(self):
        cache.clear()

    def post_with_race(self, exists_results):
        duplicate = IntegrityError("UNIQUE constraint failed")

        with patch.object(UserManager, "create_user", side_effect=duplicate), \
                patch("django.db.models.query.QuerySet.exists", side_effect=exists_results):
            return self.client.post(
                self.url, self.payload, content_type="application/json"
            )

    def test_race_on_username_returns_400(self):
        # Simula outro cadastro com o mesmo nome entre a validação e o INSERT:
        # o INSERT falha e, ao conferir de novo, o nome já existe.
        response = self.post_with_race([False, False, True, False])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(list(response.json()["errors"]), ["username"])

    def test_race_on_email_returns_400(self):
        response = self.post_with_race([False, False, False, True])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(list(response.json()["errors"]), ["email"])

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

        expenses_by_category = response.json()["expenses_by_category"]
        categories = [item["category"] for item in expenses_by_category]
        self.assertNotIn("Viagem", categories)

        own_ids = set(Category.objects.filter(user=self.ana).values_list("id", flat=True))
        for item in expenses_by_category:
            self.assertIn(item["category_id"], own_ids | {None})

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


class CategoryDeletionRuleTests(TestCase):
    """Transaction.category usa on_delete=RESTRICT."""

    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="teste123")
        self.category = Category.objects.create(name="Mercado", user=self.user)
        self.transaction = Transaction.objects.create(
            description="Compra",
            amount=Decimal("50.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=self.category,
            user=self.user,
        )

    def test_category_with_transactions_cannot_be_deleted_alone(self):
        with self.assertRaises(RestrictedError):
            self.category.delete()

        self.assertTrue(Transaction.objects.filter(id=self.transaction.id).exists())

    def test_deleting_user_removes_transactions_and_categories(self):
        # Com PROTECT isto levantava ProtectedError (achado pelos testes E2E).
        self.user.delete()

        self.assertFalse(Transaction.objects.filter(id=self.transaction.id).exists())
        self.assertFalse(Category.objects.filter(id=self.category.id).exists())


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


class AccountDeletionTests(TestCase):
    """Excluir a própria conta: pede a senha e apaga só os dados do usuário."""

    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other_user = User.objects.create_user(username="bruno", password="senha-forte-123")

        category = Category.objects.create(name="Mercado", user=self.user)
        Transaction.objects.create(
            description="Compras",
            amount=Decimal("80.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=category,
            user=self.user,
        )

        other_category = Category.objects.create(name="Lazer", user=self.other_user)
        Transaction.objects.create(
            description="Cinema",
            amount=Decimal("40.00"),
            type=Transaction.Type.EXPENSE,
            date=date(2026, 10, 10),
            category=other_category,
            user=self.other_user,
        )

        self.client.force_login(self.user)

    def delete_account(self, payload, client=None):
        return (client or self.client).delete(
            "/api/auth/account/",
            payload,
            content_type="application/json",
        )

    def test_summary_shows_what_will_be_deleted(self):
        response = self.client.get("/api/auth/account/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["transactions"], 1)
        self.assertEqual(response.json()["categories"], 1)

    def test_wrong_or_missing_password_keeps_the_account(self):
        for payload in ({"password": "errada"}, {}):
            with self.subTest(payload=payload):
                response = self.delete_account(payload)

                self.assertEqual(response.status_code, 400)
                self.assertIn("password", response.json()["errors"])
                self.assertTrue(User.objects.filter(id=self.user.id).exists())

    def test_correct_password_deletes_only_own_data_and_ends_session(self):
        response = self.delete_account({"password": "senha-forte-123"})

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(id=self.user.id).exists())
        self.assertFalse(Transaction.objects.filter(user_id=self.user.id).exists())
        self.assertFalse(Category.objects.filter(user_id=self.user.id).exists())

        # Os dados de outra pessoa continuam intactos.
        self.assertEqual(Transaction.objects.filter(user=self.other_user).count(), 1)
        self.assertEqual(Category.objects.filter(user=self.other_user).count(), 1)

        # A sessão foi encerrada.
        session = self.client.get("/api/auth/session/").json()
        self.assertFalse(session["authenticated"])

    def test_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)

        response = self.delete_account({"password": "senha-forte-123"}, client=client)

        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(id=self.user.id).exists())

    def test_anonymous_cannot_access(self):
        self.client.logout()

        self.assertEqual(self.client.get("/api/auth/account/").status_code, 401)
        self.assertEqual(
            self.delete_account({"password": "senha-forte-123"}).status_code,
            401,
        )


class AccountUpdateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ana",
            email="ana@example.com",
            password="senha-forte-123",
        )
        self.other_user = User.objects.create_user(
            username="bruno",
            email="bruno@example.com",
            password="senha-forte-123",
        )

        self.client.force_login(self.user)

    def update_account(self, payload, client=None):
        return (client or self.client).patch(
            "/api/auth/account/",
            payload,
            content_type="application/json",
        )

    def test_changes_username(self):
        response = self.update_account({"username": "  ana.silva "})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["username"], "ana.silva")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "ana.silva")

    def test_username_taken_or_invalid_is_rejected(self):
        for username in ("bruno", "", "ana silva"):
            with self.subTest(username=username):
                response = self.update_account({"username": username})

                self.assertEqual(response.status_code, 400)
                self.assertIn("username", response.json()["errors"])
                self.user.refresh_from_db()
                self.assertEqual(self.user.username, "ana")

    def test_keeping_the_same_data_does_not_ask_for_password(self):
        response = self.update_account({"username": "ana", "email": "ana@example.com"})

        self.assertEqual(response.status_code, 200)

    def test_changing_email_requires_correct_password(self):
        for payload in (
            {"email": "nova@example.com"},
            {"email": "nova@example.com", "password": "errada"},
        ):
            with self.subTest(payload=payload):
                response = self.update_account(payload)

                self.assertEqual(response.status_code, 400)
                self.assertIn("password", response.json()["errors"])
                self.user.refresh_from_db()
                self.assertEqual(self.user.email, "ana@example.com")

    def test_changes_email_with_password_and_normalizes_domain(self):
        response = self.update_account({
            "email": " Ana.Nova@EXAMPLE.com ",
            "password": "senha-forte-123",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "Ana.Nova@example.com")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "Ana.Nova@example.com")

    def test_email_in_use_or_invalid_is_rejected(self):
        for email in ("BRUNO@example.com", "nao-e-email", ""):
            with self.subTest(email=email):
                response = self.update_account({
                    "email": email,
                    "password": "senha-forte-123",
                })

                self.assertEqual(response.status_code, 400)
                self.assertIn("email", response.json()["errors"])

    def test_database_rejects_duplicate_email_ignoring_case(self):
        with self.assertRaises(IntegrityError):
            User.objects.create_user(username="carla", email="ANA@example.com", password="x")

    def test_users_without_email_do_not_conflict(self):
        User.objects.create_user(username="carla", password="x")
        User.objects.create_user(username="davi", password="x")

        self.assertEqual(User.objects.filter(email="").count(), 2)

    def test_empty_payload_is_rejected(self):
        response = self.update_account({})

        self.assertEqual(response.status_code, 400)

    def test_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)

        response = self.update_account({"username": "ana.silva"}, client=client)

        self.assertEqual(response.status_code, 403)

    def test_anonymous_cannot_update(self):
        self.client.logout()

        self.assertEqual(self.update_account({"username": "x"}).status_code, 401)


class RateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")

    def tearDown(self):
        cache.clear()

    def login(self, username, password):
        return self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            content_type="application/json",
        )

    def test_login_blocks_username_after_five_failures(self):
        for _ in range(5):
            self.assertEqual(self.login("ana", "errada").status_code, 401)

        response = self.login("ana", "senha-forte-123")

        self.assertEqual(response.status_code, 429)
        self.assertGreater(int(response["Retry-After"]), 0)
        self.assertFalse(self.client.get("/api/auth/session/").json()["authenticated"])

    def test_username_limit_ignores_case(self):
        for _ in range(5):
            self.login("ANA", "errada")

        self.assertEqual(self.login("ana", "senha-forte-123").status_code, 429)

    def test_successful_logins_do_not_count(self):
        for _ in range(10):
            self.assertEqual(self.login("ana", "senha-forte-123").status_code, 200)

    def test_login_blocks_ip_after_twenty_failures(self):
        for number in range(20):
            self.assertEqual(self.login(f"pessoa{number}", "errada").status_code, 401)

        self.assertEqual(self.login("ana", "senha-forte-123").status_code, 429)

    def test_register_blocks_ip_after_thirty_attempts(self):
        for _ in range(30):
            response = self.client.post("/api/auth/register/", {}, content_type="application/json")
            self.assertEqual(response.status_code, 400)

        response = self.client.post("/api/auth/register/", {}, content_type="application/json")

        self.assertEqual(response.status_code, 429)

    def test_account_deletion_blocks_after_five_wrong_passwords(self):
        self.client.force_login(self.user)

        for _ in range(5):
            response = self.client.delete(
                "/api/auth/account/",
                {"password": "errada"},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)

        response = self.client.delete(
            "/api/auth/account/",
            {"password": "senha-forte-123"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 429)
        self.assertTrue(User.objects.filter(id=self.user.id).exists())

    def test_email_change_blocks_after_five_wrong_passwords(self):
        self.client.force_login(self.user)

        def change_email(password):
            return self.client.patch(
                "/api/auth/account/",
                {"email": "nova@example.com", "password": password},
                content_type="application/json",
            )

        for _ in range(5):
            self.assertEqual(change_email("errada").status_code, 400)

        self.assertEqual(change_email("senha-forte-123").status_code, 429)

    def test_api_throttles_authenticated_user(self):
        self.client.force_login(self.user)

        with patch.object(UserRateThrottle, "THROTTLE_RATES", {"user": "2/min"}):
            self.assertEqual(self.client.get("/api/categories/").status_code, 200)
            self.assertEqual(self.client.get("/api/categories/").status_code, 200)
            self.assertEqual(self.client.get("/api/categories/").status_code, 429)


class LoginWithEmailTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="ana",
            email="ana@example.com",
            password="senha-forte-123",
        )

    def tearDown(self):
        cache.clear()

    def login(self, username, password="senha-forte-123"):
        return self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            content_type="application/json",
        )

    def test_logs_in_with_username_or_email(self):
        for identifier in ("ana", "ana@example.com", "ANA@Example.com"):
            with self.subTest(identifier=identifier):
                response = self.login(identifier)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["user"]["username"], "ana")
                self.client.logout()

    def test_wrong_password_with_email_is_rejected(self):
        self.assertEqual(self.login("ana@example.com", "errada").status_code, 401)

    def test_username_with_at_sign_wins_over_other_users_email(self):
        other = User.objects.create_user(username="ana@example.com", password="outra-senha-456")

        response = self.login("ana@example.com", "outra-senha-456")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], other.id)

    def test_inactive_user_cannot_log_in_with_email(self):
        self.user.is_active = False
        self.user.save()

        self.assertEqual(self.login("ana@example.com").status_code, 401)


class RegisterEmailTests(TestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user(username="ana", email="ana@example.com", password="x")

    def tearDown(self):
        cache.clear()

    def register(self, **fields):
        payload = {
            "username": "novousuario",
            "email": "novo@example.com",
            "password": "SenhaForte!2026",
            "password_confirmation": "SenhaForte!2026",
            **fields,
        }
        return self.client.post("/api/auth/register/", payload, content_type="application/json")

    def test_creates_account_with_email(self):
        response = self.register(email=" Novo@EXAMPLE.com ")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["email"], "Novo@example.com")
        self.assertTrue(User.objects.filter(username="novousuario", email="Novo@example.com").exists())

    def test_email_is_required_and_must_be_valid_and_unique(self):
        for email in (None, "", "nao-e-email", "ANA@example.com"):
            with self.subTest(email=email):
                response = self.register(email=email)

                self.assertEqual(response.status_code, 400)
                self.assertIn("email", response.json()["errors"])
                self.assertFalse(User.objects.filter(username="novousuario").exists())

    def test_new_account_can_log_in_with_email(self):
        self.register()
        self.client.logout()

        response = self.client.post(
            "/api/auth/login/",
            {"username": "novo@example.com", "password": "SenhaForte!2026"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)


class PasswordChangeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.client.force_login(self.user)

    def tearDown(self):
        cache.clear()

    def change(self, client=None, **fields):
        payload = {
            "current_password": "senha-forte-123",
            "new_password": "Carteira!Verde42",
            "new_password_confirmation": "Carteira!Verde42",
            **fields,
        }
        return (client or self.client).post("/api/auth/password/", payload, content_type="application/json")

    def test_changes_password_and_keeps_current_session(self):
        response = self.change()

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Carteira!Verde42"))
        self.assertTrue(self.client.get("/api/auth/session/").json()["authenticated"])

    def test_warns_the_owner_by_email(self):
        self.user.email = "ana@example.com"
        self.user.save()

        with patch("transactions.api.auth_views.send_in_background") as send:
            self.change()

        self.assertEqual(send.call_args.args[0].subject, "Sua senha do FinanceFlow foi alterada")

    def test_ends_other_sessions(self):
        other_device = Client()
        other_device.force_login(self.user)

        self.change()

        self.assertFalse(other_device.get("/api/auth/session/").json()["authenticated"])

    def test_invalid_input_keeps_old_password(self):
        cases = [
            ({"current_password": "errada"}, "current_password"),
            ({"current_password": ""}, "current_password"),
            ({"new_password": "123", "new_password_confirmation": "123"}, "new_password"),
            ({"new_password": "senha-forte-123", "new_password_confirmation": "senha-forte-123"}, "new_password"),
            ({"new_password_confirmation": "outra-coisa"}, "new_password_confirmation"),
        ]

        for fields, field in cases:
            with self.subTest(field=field, fields=fields):
                response = self.change(**fields)

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["errors"])
                self.user.refresh_from_db()
                self.assertTrue(self.user.check_password("senha-forte-123"))

    def test_blocks_after_five_wrong_current_passwords(self):
        for _ in range(5):
            self.assertEqual(self.change(current_password="errada").status_code, 400)

        self.assertEqual(self.change().status_code, 429)

    def test_requires_csrf_and_login(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(self.change(client=client).status_code, 403)

        self.client.logout()
        self.assertEqual(self.change().status_code, 401)


class CategoryBudgetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.client.force_login(self.user)
        self.category = Category.objects.create(name="Mercado", user=self.user)

    def patch(self, payload, category=None):
        return self.client.patch(
            f"/api/categories/{(category or self.category).id}/",
            payload,
            content_type="application/json",
        )

    def test_creates_category_with_budget(self):
        response = self.client.post(
            "/api/categories/",
            {"name": "Lazer", "monthly_budget": "300.5"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["monthly_budget"], "300.50")

    def test_sets_changes_and_clears_budget(self):
        self.assertEqual(self.patch({"monthly_budget": 800}).json()["monthly_budget"], "800.00")
        self.assertEqual(self.patch({"monthly_budget": "950,00".replace(",", ".")}).json()["monthly_budget"], "950.00")

        response = self.patch({"monthly_budget": None})

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["monthly_budget"])
        self.category.refresh_from_db()
        self.assertIsNone(self.category.monthly_budget)

    def test_renaming_keeps_budget(self):
        self.patch({"monthly_budget": "500"})

        response = self.patch({"name": "Supermercado"})

        self.assertEqual(response.json(), {"id": self.category.id, "name": "Supermercado", "monthly_budget": "500.00"})

    def test_invalid_budget_is_rejected(self):
        for value in (0, -10, "abc", True, "100000000", "NaN"):
            with self.subTest(value=value):
                response = self.patch({"monthly_budget": value})

                self.assertEqual(response.status_code, 400)
                self.assertIn("monthly_budget", response.json())

    def test_list_includes_budget(self):
        self.patch({"monthly_budget": "250"})

        categories = {item["name"]: item for item in self.client.get("/api/categories/").json()}

        self.assertEqual(categories["Mercado"]["monthly_budget"], "250.00")

    def test_default_category_does_not_accept_budget(self):
        default = Category.objects.create(name="Transferências", user=self.user)

        self.assertEqual(self.patch({"monthly_budget": "100"}, category=default).status_code, 400)

    def test_empty_patch_is_rejected(self):
        self.assertEqual(self.patch({}).status_code, 400)


class TransactionPeriodFilterTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other = User.objects.create_user(username="bruno", password="senha-forte-123")
        self.client.force_login(self.user)

        for user, description, day in [
            (self.user, "Outubro", date(2026, 10, 31)),
            (self.user, "Novembro", date(2026, 11, 1)),
            (self.user, "Ano passado", date(2025, 11, 10)),
            (self.other, "De outra pessoa", date(2026, 11, 2)),
        ]:
            Transaction.objects.create(
                user=user,
                description=description,
                amount=Decimal("10.00"),
                type=Transaction.Type.EXPENSE,
                date=day,
            )

    def descriptions(self, query=""):
        response = self.client.get(f"/api/transactions/{query}")
        self.assertEqual(response.status_code, 200)
        return [item["description"] for item in response.json()]

    def test_without_period_returns_everything_from_the_user(self):
        self.assertEqual(self.descriptions(), ["Novembro", "Outubro", "Ano passado"])

    def test_filters_by_month_and_year(self):
        self.assertEqual(self.descriptions("?month=11&year=2026"), ["Novembro"])
        self.assertEqual(self.descriptions("?month=10&year=2026"), ["Outubro"])
        self.assertEqual(self.descriptions("?month=12&year=2026"), [])

    def test_filters_by_year_only(self):
        self.assertEqual(self.descriptions("?year=2025"), ["Ano passado"])

    def test_invalid_period_is_rejected(self):
        for query in ("?month=13&year=2026", "?month=abc&year=2026", "?month=11", "?year=1999"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"/api/transactions/{query}").status_code, 400)



class FixedBillTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other = User.objects.create_user(username="bruno", password="senha-forte-123")
        self.client.force_login(self.user)
        self.category = Category.objects.create(name="Moradia", user=self.user)
        self.rent = FixedBill.objects.create(
            user=self.user, description="Aluguel", amount=Decimal("1800.00"), due_day=10, category=self.category
        )
        FixedBill.objects.filter(id=self.rent.id).update(created_at="2026-01-01T12:00:00Z")
        self.rent.refresh_from_db()

    def statuses(self, month, year, today):
        entries, summary = get_fixed_bills_for_period(self.user, month, year, today)
        return {entry["bill"].description: entry["status"] for entry in entries}, summary

    def pay(self, bill=None, **payload):
        return self.client.post(
            f"/api/fixed-bills/{(bill or self.rent).id}/pay/", payload, content_type="application/json"
        )

    def test_status_follows_the_due_day(self):
        self.assertEqual(self.statuses(11, 2026, date(2026, 11, 5))[0], {"Aluguel": "pending"})
        self.assertEqual(self.statuses(11, 2026, date(2026, 11, 10))[0], {"Aluguel": "due_today"})
        self.assertEqual(self.statuses(11, 2026, date(2026, 11, 11))[0], {"Aluguel": "overdue"})
        self.assertEqual(self.statuses(10, 2026, date(2026, 11, 5))[0], {"Aluguel": "overdue"})
        self.assertEqual(self.statuses(12, 2026, date(2026, 11, 5))[0], {"Aluguel": "pending"})

    def test_bill_without_due_day_is_pending_until_the_month_ends(self):
        FixedBill.objects.filter(id=self.rent.id).update(due_day=None)

        self.assertEqual(self.statuses(11, 2026, date(2026, 11, 30))[0], {"Aluguel": "pending"})
        self.assertEqual(self.statuses(10, 2026, date(2026, 11, 1))[0], {"Aluguel": "overdue"})

    def test_bills_are_sorted_by_due_day_with_no_due_day_last(self):
        FixedBill.objects.create(user=self.user, description="Academia", amount=Decimal("100"), category=self.category)
        FixedBill.objects.create(user=self.user, description="Internet", amount=Decimal("99"), due_day=4, category=self.category)

        entries, _ = get_fixed_bills_for_period(self.user, 11, 2026, date(2026, 11, 5))

        self.assertEqual([entry["bill"].description for entry in entries], ["Internet", "Aluguel", "Academia"])

    def test_due_day_31_falls_on_the_last_day_of_short_months(self):
        self.rent.due_day = 31

        self.assertEqual(get_due_date(self.rent, 2, 2026), date(2026, 2, 28))
        self.assertEqual(get_due_date(self.rent, 2, 2028), date(2028, 2, 29))

    def test_bill_does_not_appear_before_it_was_created(self):
        self.assertEqual(self.statuses(12, 2025, date(2026, 11, 5))[0], {})

    def test_paying_creates_an_expense_linked_to_the_bill(self):
        response = self.pay(amount="1850.00", date="2026-11-08")

        self.assertEqual(response.status_code, 201)
        payment = Transaction.objects.get(id=response.json()["id"])
        self.assertEqual(payment.fixed_bill, self.rent)
        self.assertEqual(payment.type, Transaction.Type.EXPENSE)
        self.assertEqual(payment.category, self.category)
        self.assertEqual(payment.amount, Decimal("1850.00"))
        self.assertEqual(response.json()["fixed_bill"], self.rent.id)

        statuses, summary = self.statuses(11, 2026, date(2026, 11, 20))
        self.assertEqual(statuses, {"Aluguel": "paid"})
        self.assertEqual(summary["paid_total"], Decimal("1850.00"))
        self.assertEqual(summary["pending_count"], 0)

    def test_paying_uses_bill_amount_and_today_by_default(self):
        response = self.pay()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["amount"], "1800.00")

    def test_cannot_pay_twice_in_the_same_month(self):
        self.pay(date="2026-11-08")

        response = self.pay(date="2026-11-20")

        self.assertEqual(response.status_code, 400)
        self.assertIn("já foi paga em novembro", response.json()["detail"])
        self.assertEqual(self.pay(date="2026-12-08").status_code, 201)

    def test_deleting_the_payment_makes_the_bill_pending_again(self):
        payment_id = self.pay(date="2026-11-08").json()["id"]

        self.client.delete(f"/api/transactions/{payment_id}/")

        self.assertEqual(self.statuses(11, 2026, date(2026, 11, 9))[0], {"Aluguel": "pending"})

    def test_deleting_the_bill_keeps_past_payments(self):
        payment_id = self.pay(date="2026-11-08").json()["id"]

        self.assertEqual(self.client.delete(f"/api/fixed-bills/{self.rent.id}/").status_code, 204)

        payment = Transaction.objects.get(id=payment_id)
        self.assertIsNone(payment.fixed_bill)

    def test_create_update_and_validation(self):
        created = self.client.post(
            "/api/fixed-bills/",
            {"description": "  Internet   fibra ", "amount": "99.90", "category": self.category.id},
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["description"], "Internet fibra")
        self.assertIsNone(created.json()["due_day"])

        bill_id = created.json()["id"]
        updated = self.client.patch(
            f"/api/fixed-bills/{bill_id}/", {"due_day": 15}, content_type="application/json"
        )
        self.assertEqual(updated.json()["due_day"], 15)

        invalid = [
            {"description": "", "amount": "10", "category": self.category.id},
            {"description": "X", "amount": "0", "category": self.category.id},
            {"description": "X", "amount": "10", "category": self.category.id, "due_day": 32},
            {"description": "X", "amount": "10"},
        ]
        for payload in invalid:
            with self.subTest(payload=payload):
                response = self.client.post("/api/fixed-bills/", payload, content_type="application/json")
                self.assertEqual(response.status_code, 400)

    def test_list_endpoint_returns_status_and_summary(self):
        response = self.client.get("/api/fixed-bills/?month=11&year=2026")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["period"], {"month": 11, "year": 2026})
        self.assertEqual(body["bills"][0]["description"], "Aluguel")
        self.assertEqual(body["bills"][0]["due_date"], "2026-11-10")
        self.assertEqual(body["summary"]["pending_total"], "1800.00")

    def test_other_users_cannot_see_edit_or_pay(self):
        foreign_category = Category.objects.create(name="Casa", user=self.other)
        foreign = FixedBill.objects.create(
            user=self.other, description="Conta do Bruno", amount=Decimal("50"), category=foreign_category
        )

        listed = [bill["description"] for bill in self.client.get("/api/fixed-bills/").json()["bills"]]
        self.assertNotIn("Conta do Bruno", listed)
        self.assertEqual(self.pay(bill=foreign).status_code, 404)

        patch_response = self.client.patch(
            f"/api/fixed-bills/{foreign.id}/", {"amount": "1"}, content_type="application/json"
        )
        self.assertEqual(patch_response.status_code, 404)

        create_response = self.client.post(
            "/api/fixed-bills/",
            {"description": "X", "amount": "10", "category": foreign_category.id},
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 400)

    def test_deleting_a_category_moves_its_bills_to_transfers(self):
        response = self.client.delete(
            "/api/categories/", {"id": self.category.id}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 204)
        self.rent.refresh_from_db()
        self.assertEqual(self.rent.category.name, "Transferências")

    def test_deleting_the_account_removes_bills(self):
        self.pay(date="2026-11-08")

        response = self.client.delete(
            "/api/auth/account/", {"password": "senha-forte-123"}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(FixedBill.objects.filter(user_id=self.user.id).exists())


class InstallmentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other = User.objects.create_user(username="bruno", password="senha-forte-123")
        self.category = Category.objects.create(user=self.user, name="Celular", monthly_budget="500.00")
        self.client.force_login(self.user)

    def buy(self, **changes):
        return self.client.post(
            "/api/transactions/",
            {
                "description": "Celular",
                "amount": "150.00",
                "type": "EXPENSE",
                "date": "2026-11-06",
                "category": self.category.id,
                "installments": 3,
                **changes,
            },
            content_type="application/json",
        )

    def purchase(self):
        return Transaction.objects.filter(user=self.user).order_by("installment_number")

    def test_creates_one_expense_per_month(self):
        response = self.buy()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["installment_number"], 1)
        self.assertEqual(response.json()["installment_total"], 3)
        self.assertEqual(response.json()["id"], self.purchase().first().id)
        self.assertNotIn("installments", response.json())
        self.assertEqual(
            [item.date for item in self.purchase()],
            [date(2026, 11, 6), date(2026, 12, 6), date(2027, 1, 6)],
        )
        self.assertEqual([item.installment_number for item in self.purchase()], [1, 2, 3])
        self.assertEqual({item.amount for item in self.purchase()}, {Decimal("150.00")})
        self.assertEqual(len({item.installment_group for item in self.purchase()}), 1)

    def test_each_month_only_counts_its_own_installment(self):
        self.buy()

        november = get_financial_summary(self.user, 11, 2026)
        january = get_financial_summary(self.user, 1, 2027)

        self.assertEqual(november["expenses"], Decimal("150.00"))
        self.assertEqual(january["expenses"], Decimal("150.00"))

    def test_day_is_kept_after_a_shorter_month(self):
        self.assertEqual(add_months(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(add_months(date(2026, 1, 31), 2), date(2026, 3, 31))
        self.assertEqual(add_months(date(2026, 12, 15), 1), date(2027, 1, 15))

    def test_regular_expense_has_no_installment_data(self):
        response = self.client.post(
            "/api/transactions/",
            {"description": "Almoço", "amount": "30.00", "type": "EXPENSE", "date": "2026-11-06"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.json()["installment_total"])
        self.assertEqual(Transaction.objects.count(), 1)

    def test_rejects_invalid_installments_without_saving(self):
        for value in [1, 61, "abc"]:
            with self.subTest(value=value):
                response = self.buy(installments=value)

                self.assertEqual(response.status_code, 400)
                self.assertIn("installments", response.json())

        self.assertEqual(Transaction.objects.count(), 0)

    def test_income_cannot_be_split(self):
        response = self.buy(type="INCOME")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Transaction.objects.count(), 0)

    def test_rejects_purchase_ending_after_supported_period(self):
        response = self.buy(date="2100-12-01")

        self.assertEqual(response.status_code, 400)
        self.assertIn("date", response.json())
        self.assertEqual(Transaction.objects.count(), 0)

    def test_editing_changes_only_that_installment(self):
        self.buy()
        second = self.purchase()[1]

        response = self.client.patch(
            f"/api/transactions/{second.id}/",
            {"amount": "99.00"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item.amount for item in self.purchase()],
            [Decimal("150.00"), Decimal("99.00"), Decimal("150.00")],
        )

    def test_existing_transaction_cannot_become_installments_or_income(self):
        self.buy()
        first = self.purchase().first()

        for changes, field in [({"installments": 4}, "installments"), ({"type": "INCOME"}, "type")]:
            with self.subTest(field=field):
                response = self.client.patch(
                    f"/api/transactions/{first.id}/",
                    changes,
                    content_type="application/json",
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json())

        self.assertEqual(self.purchase().count(), 3)

    def test_delete_removes_only_that_installment_by_default(self):
        self.buy()
        second = self.purchase()[1]

        response = self.client.delete(f"/api/transactions/{second.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertEqual([item.installment_number for item in self.purchase()], [1, 3])

    def test_delete_following_keeps_earlier_installments(self):
        self.buy()
        second = self.purchase()[1]

        response = self.client.delete(f"/api/transactions/{second.id}/?scope=following")

        self.assertEqual(response.status_code, 204)
        self.assertEqual([item.installment_number for item in self.purchase()], [1])

    def test_delete_following_does_not_touch_other_purchases(self):
        self.buy()
        self.buy(description="Notebook")
        first = self.purchase().filter(description="Celular").first()

        self.client.delete(f"/api/transactions/{first.id}/?scope=following")

        self.assertEqual(self.purchase().filter(description="Notebook").count(), 3)
        self.assertEqual(self.purchase().filter(description="Celular").count(), 0)

    def test_delete_following_on_regular_transaction_removes_only_it(self):
        regular = Transaction.objects.create(
            user=self.user, description="Almoço", amount="30.00", type="EXPENSE", date=date(2026, 11, 6)
        )
        self.buy()

        self.client.delete(f"/api/transactions/{regular.id}/?scope=following")

        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 3)

    def test_other_users_cannot_delete_installments(self):
        self.buy()
        first = self.purchase().first()
        self.client.force_login(self.other)

        response = self.client.delete(f"/api/transactions/{first.id}/?scope=following")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Transaction.objects.filter(user=self.user).count(), 3)


class SidebarSummaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other = User.objects.create_user(username="bruno", password="senha-forte-123")
        self.category = Category.objects.create(user=self.user, name="Casa")
        self.other_category = Category.objects.create(user=self.other, name="Casa")

    def test_returns_only_the_current_month_of_the_logged_user(self):
        today = timezone.localdate()
        Transaction.objects.create(
            user=self.user, description="Salário", amount="1000.00", type="INCOME", date=today
        )
        Transaction.objects.create(
            user=self.other, description="De outra pessoa", amount="50.00", type="EXPENSE", date=today
        )
        FixedBill.objects.create(user=self.user, description="Internet", amount="80.00", category=self.category)
        FixedBill.objects.create(user=self.other, description="Outra", amount="10.00", category=self.other_category)
        self.client.force_login(self.user)

        data = self.client.get("/api/sidebar-summary/").json()

        self.assertEqual(data["period"], {"month": today.month, "year": today.year})
        self.assertEqual(Decimal(data["summary"]["income"]), Decimal("1000.00"))
        self.assertEqual(Decimal(data["summary"]["expenses"]), Decimal("0"))
        self.assertEqual([bill["description"] for bill in data["bills"]], ["Internet"])

    def test_requires_login(self):
        self.assertIn(self.client.get("/api/sidebar-summary/").status_code, (401, 403))


class StatementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.other = User.objects.create_user(username="bruno", password="senha-forte-123")
        self.category = Category.objects.create(user=self.user, name="Mercado")
        self.client.force_login(self.user)

        for description, amount, kind, day in [
            ("Salário", "3000.00", "INCOME", date(2026, 11, 1)),
            ("Feira", "120.50", "EXPENSE", date(2026, 11, 10)),
            ("Mês seguinte", "99.00", "EXPENSE", date(2026, 12, 1)),
        ]:
            Transaction.objects.create(
                user=self.user,
                description=description,
                amount=amount,
                type=kind,
                date=day,
                category=self.category,
            )

        Transaction.objects.create(
            user=self.other, description="De outra pessoa", amount="1.00", type="EXPENSE", date=date(2026, 11, 2)
        )

    def statement(self, **params):
        return self.client.get("/api/statement/", {"start": "2026-11-01", "end": "2026-11-30", **params})

    def export(self, **params):
        return self.client.get("/api/statement/export/", {"start": "2026-11-01", "end": "2026-11-30", **params})

    def csv_lines(self, **params):
        return self.export(**params).content.decode("utf-8-sig").splitlines()

    def test_lists_only_the_period_of_the_logged_user_oldest_first(self):
        data = self.statement().json()

        self.assertEqual([item["description"] for item in data["transactions"]], ["Salário", "Feira"])
        self.assertEqual(Decimal(data["summary"]["income"]), Decimal("3000.00"))
        self.assertEqual(Decimal(data["summary"]["expenses"]), Decimal("120.50"))
        self.assertEqual(Decimal(data["summary"]["balance"]), Decimal("2879.50"))

    def test_filters_by_type(self):
        data = self.statement(type="EXPENSE").json()

        self.assertEqual([item["description"] for item in data["transactions"]], ["Feira"])
        self.assertEqual(Decimal(data["summary"]["income"]), Decimal("0"))

    def test_period_includes_both_limits(self):
        data = self.statement(start="2026-11-10", end="2026-12-01").json()

        self.assertEqual([item["description"] for item in data["transactions"]], ["Feira", "Mês seguinte"])

    def test_rejects_invalid_filters(self):
        for params in [{"start": "2026-12-01"}, {"start": "ontem"}, {"type": "OUTRO"}]:
            with self.subTest(params=params):
                self.assertEqual(self.statement(**params).status_code, 400)
                self.assertEqual(self.export(**params).status_code, 400)

    def test_requires_both_dates(self):
        self.assertEqual(self.client.get("/api/statement/").status_code, 400)

    def test_requires_login(self):
        self.client.logout()

        self.assertIn(self.statement().status_code, (401, 403))
        self.assertIn(self.export().status_code, (401, 403))

    def test_csv_opens_in_brazilian_excel(self):
        response = self.export()

        self.assertTrue(response.content.startswith(b"\xef\xbb\xbf"))
        self.assertIn("text/csv", response["Content-Type"])
        self.assertEqual(
            response["Content-Disposition"],
            'attachment; filename="extrato_2026-11-01_2026-11-30.csv"',
        )
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(
            self.csv_lines(),
            [
                "Data;Descrição;Categoria;Tipo;Valor;Parcela",
                "01/11/2026;Salário;Mercado;Receita;3000,00;",
                "10/11/2026;Feira;Mercado;Despesa;-120,50;",
            ],
        )

    def test_csv_shows_the_installment(self):
        Transaction.objects.create(
            user=self.user,
            description="Celular",
            amount="150.00",
            type="EXPENSE",
            date=date(2026, 11, 20),
            installment_number=2,
            installment_total=5,
        )

        self.assertEqual(self.csv_lines()[-1], "20/11/2026;Celular;;Despesa;-150,00;2 de 5")

    def test_csv_keeps_semicolons_inside_a_description(self):
        Transaction.objects.create(
            user=self.user, description="Pão; leite", amount="9.00", type="EXPENSE", date=date(2026, 11, 20)
        )

        self.assertIn('"Pão; leite"', self.csv_lines()[-1])

    def test_formula_like_descriptions_are_neutralized(self):
        for text in ["=HYPERLINK(1)", "+1", "-1", "@SUM(1)", "\tx", "\rx"]:
            with self.subTest(text=text):
                self.assertEqual(safe_cell(text), f"'{text}")

        self.assertEqual(safe_cell("Feira"), "Feira")

    def test_formula_is_neutralized_in_the_exported_file(self):
        Transaction.objects.create(
            user=self.user, description="=1+1", amount="9.00", type="EXPENSE", date=date(2026, 11, 20)
        )

        self.assertIn(";'=1+1;", self.csv_lines()[-1])


class BrazilTimezoneTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ana", password="senha-forte-123")
        self.category = Category.objects.create(name="Moradia", user=self.user)

    def at_utc(self, *moment):
        return patch("django.utils.timezone.now", return_value=datetime(*moment, tzinfo=dt_timezone.utc))

    def test_after_9pm_in_brazil_it_is_still_the_same_day(self):
        bill = FixedBill.objects.create(
            user=self.user, description="Energia", amount=Decimal("100"), due_day=6, category=self.category
        )
        FixedBill.objects.filter(id=bill.id).update(created_at="2026-01-01T12:00:00Z")

        with self.at_utc(2026, 11, 7, 0, 30):
            self.client.force_login(self.user)
            response = self.client.get("/api/fixed-bills/")

        self.assertEqual(response.json()["bills"][0]["status"], "due_today")

    def test_dashboard_stays_in_the_current_month_on_the_last_night(self):
        with self.at_utc(2026, 12, 1, 0, 30):
            self.client.force_login(self.user)
            response = self.client.get("/api/dashboard/")

        self.assertEqual(response.json()["period"], {"month": 11, "year": 2026})

    def test_payment_without_date_uses_the_local_day(self):
        bill = FixedBill.objects.create(
            user=self.user, description="Energia", amount=Decimal("100"), category=self.category
        )

        with self.at_utc(2026, 11, 7, 0, 30):
            self.client.force_login(self.user)
            response = self.client.post(f"/api/fixed-bills/{bill.id}/pay/", {}, content_type="application/json")

        self.assertEqual(response.json()["date"], "2026-11-06")


class SecurityConfigurationTests(TestCase):
    def read_settings(self, **env):
        code = (
            "import json, django; django.setup(); from django.conf import settings as s; "
            "print(json.dumps({"
            "'debug': s.DEBUG, 'ssl': s.SECURE_SSL_REDIRECT, 'hsts': s.SECURE_HSTS_SECONDS, "
            "'proxy': s.SECURE_PROXY_SSL_HEADER, 'session_secure': s.SESSION_COOKIE_SECURE, "
            "'csrf_secure': s.CSRF_COOKIE_SECURE, 'http_only': s.SESSION_COOKIE_HTTPONLY}))"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            env={**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", **env},
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_production_forces_https_and_secure_cookies(self):
        config = self.read_settings(
            DJANGO_DEBUG="False",
            DJANGO_ALLOWED_HOSTS="meusite.com",
            DJANGO_FRONTEND_URL="https://meusite.com",
        )

        self.assertFalse(config["debug"])
        self.assertTrue(config["ssl"])
        self.assertEqual(config["hsts"], 3600)
        self.assertTrue(config["session_secure"])
        self.assertTrue(config["csrf_secure"])
        self.assertTrue(config["http_only"])
        self.assertIsNone(config["proxy"])

    def test_console_email_is_never_used_in_production(self):
        code = (
            "import django; django.setup(); from django.conf import settings; "
            "print(settings.MAILERS['default']['BACKEND'])"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            env={**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "DJANGO_DEBUG": "False"},
            capture_output=True,
            text=True,
            check=True,
        )

        self.assertIn("smtp", result.stdout)

    def read_mailer(self, **env):
        code = (
            "import json, django; django.setup(); from django.conf import settings as s; "
            "from django.core.mail import mailers; m = mailers['default']; "
            "print(json.dumps({'backend': s.MAILERS['default']['BACKEND'], 'from': s.DEFAULT_FROM_EMAIL, "
            "'host': getattr(m, 'host', None), 'port': getattr(m, 'port', None), "
            "'username': getattr(m, 'username', None), 'password': getattr(m, 'password', None), "
            "'tls': getattr(m, 'use_tls', None)}))"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            env={
                **os.environ,
                "DJANGO_SETTINGS_MODULE": "config.settings",
                "DJANGO_DEBUG": "True",
                "DJANGO_EMAIL_HOST": "",
                "DJANGO_EMAIL_USER": "",
                "DJANGO_EMAIL_PASSWORD": "",
                "DJANGO_FROM_EMAIL": "",
                **env,
            },
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout.strip().splitlines()[-1])

    def test_development_without_smtp_password_stays_on_console(self):
        config = self.read_mailer(DJANGO_EMAIL_HOST="smtp.gmail.com", DJANGO_EMAIL_USER="ana@gmail.com")

        self.assertIn("ReadableConsoleEmailBackend", config["backend"])

    def test_smtp_password_turns_on_real_delivery(self):
        config = self.read_mailer(
            DJANGO_EMAIL_HOST="smtp.gmail.com",
            DJANGO_EMAIL_USER="ana@gmail.com",
            DJANGO_EMAIL_PASSWORD="abcd efgh ijkl mnop",
        )

        self.assertIn("smtp", config["backend"])
        self.assertEqual(config["host"], "smtp.gmail.com")
        self.assertEqual(config["port"], 587)
        self.assertEqual(config["username"], "ana@gmail.com")
        self.assertEqual(config["password"], "abcdefghijklmnop")
        self.assertTrue(config["tls"])
        self.assertEqual(config["from"], "FinanceFlow <ana@gmail.com>")

    def test_proxy_header_is_only_trusted_when_enabled(self):
        config = self.read_settings(DJANGO_DEBUG="False", DJANGO_BEHIND_PROXY="True")

        self.assertEqual(config["proxy"], ["HTTP_X_FORWARDED_PROTO", "https"])

    def test_login_cookie_is_http_only_and_same_site(self):
        cache.clear()
        User.objects.create_user(username="ana", password="senha-forte-123")

        response = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": "senha-forte-123"},
            content_type="application/json",
        )

        cookie = response.cookies["sessionid"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertNotIn("password", response.content.decode())
        cache.clear()


@override_settings(FRONTEND_URL="https://app.exemplo.com")
class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="ana", email="ana@example.com", password="senha-forte-123"
        )

        patcher = patch(
            "transactions.api.auth_views.send_in_background",
            side_effect=lambda message: message.send(),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(cache.clear)

    def request_reset(self, email="ana@example.com", **extra):
        return self.client.post(
            "/api/auth/password-reset/",
            {"email": email},
            content_type="application/json",
            **extra,
        )

    def confirm(self, uid, token, password="Carteira!Verde42", confirmation=None):
        return self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": password,
                "new_password_confirmation": confirmation or password,
            },
            content_type="application/json",
        )

    def link_parts(self):
        link = next(word for word in mail.outbox[-1].body.split() if "reset-password" in word)
        fragment = link.split("#", 1)[1]
        parts = dict(item.split("=", 1) for item in fragment.split("&"))
        return link, parts["uid"], parts["token"]

    def test_same_answer_for_existing_and_unknown_email(self):
        existing = self.request_reset()
        unknown = self.request_reset("ninguem@example.com")

        self.assertEqual(existing.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(existing.json(), unknown.json())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ana@example.com"])

    def test_email_lookup_ignores_case(self):
        self.request_reset("ANA@Example.com")

        self.assertEqual(len(mail.outbox), 1)

    def test_inactive_user_receives_nothing(self):
        self.user.is_active = False
        self.user.save()

        self.assertEqual(self.request_reset().status_code, 200)
        self.assertEqual(mail.outbox, [])

    @override_settings(ALLOWED_HOSTS=["*"])
    def test_link_uses_configured_address_not_the_host_header(self):
        self.request_reset(HTTP_HOST="site-falso.com")

        link, _, _ = self.link_parts()
        self.assertTrue(link.startswith("https://app.exemplo.com/reset-password#"))
        self.assertNotIn("site-falso", mail.outbox[0].body)

    def test_valid_link_changes_password_and_warns_the_owner(self):
        self.request_reset()
        _, uid, token = self.link_parts()

        response = self.confirm(uid, token)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Carteira!Verde42"))
        self.assertEqual(mail.outbox[-1].subject, "Sua senha do FinanceFlow foi alterada")

    def test_link_works_only_once(self):
        self.request_reset()
        _, uid, token = self.link_parts()
        self.confirm(uid, token)

        response = self.confirm(uid, token, password="Outra!Senha-Forte9")

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Carteira!Verde42"))

    def test_link_expires(self):
        self.request_reset()
        _, uid, token = self.link_parts()

        with override_settings(PASSWORD_RESET_TIMEOUT=-1):
            response = self.confirm(uid, token)

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("senha-forte-123"))

    def test_link_dies_after_logging_in(self):
        self.request_reset()
        _, uid, token = self.link_parts()

        self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": "senha-forte-123"},
            content_type="application/json",
        )
        self.client.logout()

        self.assertEqual(self.confirm(uid, token).status_code, 400)

    def test_ends_every_open_session(self):
        other_device = Client()
        other_device.force_login(self.user)
        self.request_reset()
        _, uid, token = self.link_parts()

        self.confirm(uid, token)

        self.assertFalse(other_device.get("/api/auth/session/").json()["authenticated"])

    def test_tampered_or_foreign_tokens_are_rejected_the_same_way(self):
        other = User.objects.create_user(username="bruno", email="bruno@example.com", password="x")
        self.request_reset()
        _, uid, token = self.link_parts()
        self.request_reset("bruno@example.com")
        _, other_uid, _ = self.link_parts()

        answers = [
            self.confirm(uid, token + "x"),
            self.confirm(other_uid, token),
            self.confirm("nao-e-base64!", token),
            self.confirm("OTk5OTk5", token),
        ]

        self.assertEqual({answer.status_code for answer in answers}, {400})
        self.assertEqual(len({answer.content for answer in answers}), 1)
        other.refresh_from_db()
        self.assertTrue(other.check_password("x"))

    def test_weak_or_mismatched_password_keeps_the_old_one_and_the_link(self):
        self.request_reset()
        _, uid, token = self.link_parts()

        self.assertIn("new_password", self.confirm(uid, token, password="123").json()["errors"])
        self.assertIn(
            "new_password_confirmation",
            self.confirm(uid, token, confirmation="outra-coisa").json()["errors"],
        )
        self.assertEqual(self.confirm(uid, token).status_code, 200)

    def test_limits_emails_to_the_same_address_without_revealing_it(self):
        responses = [self.request_reset() for _ in range(5)]

        self.assertEqual({response.status_code for response in responses}, {200})
        self.assertEqual(len(mail.outbox), 3)

    def test_blocks_ip_after_too_many_requests(self):
        for number in range(10):
            self.assertEqual(self.request_reset(f"pessoa{number}@example.com").status_code, 200)

        self.assertEqual(self.request_reset("outra@example.com").status_code, 429)

    def test_blocks_guessing_tokens(self):
        self.request_reset()
        _, uid, token = self.link_parts()

        for _ in range(10):
            self.assertEqual(self.confirm(uid, "abc-def").status_code, 400)

        self.assertEqual(self.confirm(uid, token).status_code, 429)

    def test_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)

        response = client.post(
            "/api/auth/password-reset/", {"email": "ana@example.com"}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(mail.outbox, [])

