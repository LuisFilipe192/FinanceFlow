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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "category" and not request.user.is_superuser:
            kwargs["queryset"] = Category.objects.filter(user=request.user)

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

admin.site.register(Transaction, TransactionAdmin)

class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "description",
        "user",
    )

    search_fields = (
        "name",
        "description",
    )

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

admin.site.register(Category, CategoryAdmin)



