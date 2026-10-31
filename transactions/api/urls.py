from django.urls import path
from . import views

urlpatterns = [
    path(
        "dashboard/",
        views.dashboard_api,
        name="dashboard-api"
    ),
    path(
        "transactions/",
        views.transactions_api,
        name="transactions-api"
    ),
    path(
        "categories/",
        views.categories_api,
        name="categories-api"
    ),
    path(
        "transactions/<int:pk>/",
        views.transaction_detail_api,
        name="transaction-detail-api"
    ),
]