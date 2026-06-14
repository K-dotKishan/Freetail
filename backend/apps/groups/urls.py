from django.urls import path
from .views import GroupListCreateView, GroupDetailView, MembershipAddView, MembershipLeaveView

urlpatterns = [
    path('', GroupListCreateView.as_view(), name='group-list-create'),
    path('<int:pk>/', GroupDetailView.as_view(), name='group-detail'),
    path('<int:group_id>/members/', MembershipAddView.as_view(), name='membership-add'),
    path('<int:group_id>/members/<int:membership_id>/', MembershipLeaveView.as_view(), name='membership-leave'),
]
