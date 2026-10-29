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
