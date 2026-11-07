from django.urls import path
from . import auth_views, fixed_bills_views, statement_views, views

urlpatterns = [
    path("auth/csrf/", auth_views.csrf_cookie, name="auth-csrf"),
    path("auth/session/", auth_views.session_status, name="auth-session"),
    path("auth/login/", auth_views.login_view, name="auth-login"),
    path("auth/register/", auth_views.register_view, name="auth-register"),
    path("auth/logout/", auth_views.logout_view, name="auth-logout"),
    path("auth/account/", auth_views.account_view, name="auth-account"),
    path("auth/password/", auth_views.password_view, name="auth-password"),
    path("auth/password-reset/", auth_views.password_reset_view, name="auth-password-reset"),
    path(
        "auth/password-reset/confirm/",
        auth_views.password_reset_confirm_view,
        name="auth-password-reset-confirm",
    ),
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
        "categories/<int:pk>/",
        views.category_detail_api,
        name="category-detail-api"
    ),
    path(
        "transactions/<int:pk>/",
        views.transaction_detail_api,
        name="transaction-detail-api"
    ),
    path(
        "statement/",
        statement_views.statement_api,
        name="statement-api"
    ),
    path(
        "statement/export/",
        statement_views.statement_export_api,
        name="statement-export-api"
    ),
    path(
        "sidebar-summary/",
        fixed_bills_views.sidebar_summary_api,
        name="sidebar-summary-api"
    ),
    path(
        "fixed-bills/",
        fixed_bills_views.fixed_bills_api,
        name="fixed-bills-api"
    ),
    path(
        "fixed-bills/<int:pk>/",
        fixed_bills_views.fixed_bill_detail_api,
        name="fixed-bill-detail-api"
    ),
    path(
        "fixed-bills/<int:pk>/pay/",
        fixed_bills_views.fixed_bill_pay_api,
        name="fixed-bill-pay-api"
    ),
]
