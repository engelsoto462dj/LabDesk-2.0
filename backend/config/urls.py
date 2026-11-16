from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from incidencias.views import IncidenciaViewSet, ComentarioViewSet

router = DefaultRouter()
router.register(r'incidencias', IncidenciaViewSet)
router.register(r'comentarios', ComentarioViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
