from django.urls import path
from .views import SettlementListCreateView, SettlementDetailView

urlpatterns = [
    path('', SettlementListCreateView.as_view(), name='settlement-list-create'),
    path('<int:pk>/', SettlementDetailView.as_view(), name='settlement-detail'),
]
