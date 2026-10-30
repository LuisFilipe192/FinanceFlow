from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from transactions.services.dashboard import (
    get_financial_summary,
    get_expenses_by_category,
    get_monthly_financial_history,
)

from transactions.models import Transaction


@login_required
def dashboard(request):
    summary = get_financial_summary(request.user)

    expenses_by_category = get_expenses_by_category(request.user)

    financial_history = get_monthly_financial_history(
        request.user,
        year=2026
    )

    
    recent_transactions = (
        Transaction.objects
        .filter(user=request.user)
        .select_related("category")
        .order_by("-date", "-id")[:5]
    )

    context = {
        "summary": summary,
        "expenses_by_category": expenses_by_category,
        "financial_history": financial_history,
        "recent_transactions": recent_transactions,
    }


    return render(request, "transactions/dashboard.html", context)