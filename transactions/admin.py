from django.contrib import admin

from transactions.models import Transaction, Category

class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "description",
        "amount",
        "type",
        "category",
        "date",
    )

    list_filter = (
        "type",
        "category",
        "date",
    )

    search_fields = (
        "description",
        "category__name",
    )

    ordering = ("-date",)

admin.site.register(Transaction, TransactionAdmin)
admin.site.register(Category)



