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

    def get_queryset(self, request):
        queryset = super().get_queryset(request)

        if request.user.is_superuser:
            return queryset

        return queryset.filter(user=request.user)

    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser:
            obj.user = request.user

        super().save_model(request, obj, form, change)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return ()

        return ("user",)

admin.site.register(Transaction, TransactionAdmin)
admin.site.register(Category)



