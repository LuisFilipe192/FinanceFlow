from django.conf import settings

from django.db import models
from django.utils import timezone

class Transaction(models.Model):

    class Type(models.TextChoices):
        INCOME = "INCOME", "Receita"
        EXPENSE = "EXPENSE", "Despesa"

    description = models.CharField(max_length=200)

    amount = models.DecimalField(max_digits=10,decimal_places=2)

    type = models.CharField(max_length=7,choices=Type.choices)

    date = models.DateField(default=timezone.localdate)

    # RESTRICT (e não PROTECT): continua impedindo apagar sozinha uma
    # categoria que ainda tem transações, mas permite quando as duas são
    # apagadas juntas pela cascata do usuário (exclusão de conta).
    category = models.ForeignKey(
        "Category",
        on_delete=models.RESTRICT,
        related_name="transactions",
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions"
    )

    fixed_bill = models.ForeignKey(
        "FixedBill",
        on_delete=models.SET_NULL,
        related_name="payments",
        null=True,
        blank=True
    )

    installment_group = models.UUIDField(null=True, blank=True, db_index=True)

    installment_number = models.PositiveSmallIntegerField(null=True, blank=True)

    installment_total = models.PositiveSmallIntegerField(null=True, blank=True)

    def __str__(self):
        return self.description

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    monthly_budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories"
    )

    def __str__(self):
        return self.name



class FixedBill(models.Model):
    description = models.CharField(max_length=200)

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    due_day = models.PositiveSmallIntegerField(null=True, blank=True)

    category = models.ForeignKey(
        "Category",
        on_delete=models.RESTRICT,
        related_name="fixed_bills"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fixed_bills"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.description
