from django.urls import path
from .views import (
    ImportUploadView,
    ImportBatchDetailView,
    ImportApproveView,
    ImportRowDecisionView,
    ImportReportView,
    ImportBatchListView,
)

urlpatterns = [
    path('', ImportBatchListView.as_view(), name='import-batch-list'),
    path('upload/', ImportUploadView.as_view(), name='import-upload'),
    path('<int:batch_id>/', ImportBatchDetailView.as_view(), name='import-batch-detail'),
    path('<int:batch_id>/approve/', ImportApproveView.as_view(), name='import-approve'),
    path('<int:batch_id>/rows/<int:row_id>/', ImportRowDecisionView.as_view(), name='import-row-decision'),
    path('<int:batch_id>/report/', ImportReportView.as_view(), name='import-report'),
]
