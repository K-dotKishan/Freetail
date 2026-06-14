from django.urls import path
from .views import ExpenseListCreateView, ExpenseDetailView, GroupBalancesView

urlpatterns = [
    path('', ExpenseListCreateView.as_view(), name='expense-list-create'),
    path('<int:pk>/', ExpenseDetailView.as_view(), name='expense-detail'),
    path('group/<int:group_id>/balances/', GroupBalancesView.as_view(), name='group-balances'),
]
