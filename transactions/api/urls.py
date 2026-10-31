from django.urls import path
from . import auth_views, views

urlpatterns = [
    path("auth/csrf/", auth_views.csrf_cookie, name="auth-csrf"),
    path("auth/session/", auth_views.session_status, name="auth-session"),
    path("auth/login/", auth_views.login_view, name="auth-login"),
    path("auth/register/", auth_views.register_view, name="auth-register"),
    path("auth/logout/", auth_views.logout_view, name="auth-logout"),
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
