from decimal import Decimal
from datetime import date
from unittest.mock import patch

from django.test import Client, TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import UserManager
from django.core.cache import cache
from django.db import IntegrityError
from django.db.models import RestrictedError
from rest_framework.throttling import UserRateThrottle

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
