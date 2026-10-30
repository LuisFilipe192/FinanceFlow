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

    category = models.ForeignKey(
        "Category",
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions"
    )

    def __str__(self):
        return self.description

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name
