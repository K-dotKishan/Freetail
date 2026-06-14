from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/groups/', include('apps.groups.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/settlements/', include('apps.settlements.urls')),
    path('api/imports/', include('apps.imports.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
