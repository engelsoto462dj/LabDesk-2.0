# SENATI - V Semestre: Taller Práctico LabDesk 2.0
# DRF ViewSets y Endpoints para Incidencias y Comentarios

from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Incidencia, Comentario
from .serializers import IncidenciaSerializer, ComentarioSerializer


class IncidenciaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo para Incidencias:
    - GET /api/incidencias/ -> Listar incidencias con comentarios incluidos
    - POST /api/incidencias/ -> Crear incidencia (con responsable, ubicacion, fecha_limite)
    - GET /api/incidencias/{id}/ -> Ver detalle con historial de comentarios
    - PUT/PATCH /api/incidencias/{id}/ -> Actualizar incidencia
    - DELETE /api/incidencias/{id}/ -> Eliminar incidencia
    - GET /api/incidencias/dashboard/ -> Indicadores y estadísticas en tiempo real
    - POST /api/incidencias/{id}/comentarios/ -> Registrar comentario en una incidencia
    """
    queryset = Incidencia.objects.all().prefetch_related('comentarios').order_by('-creado_en')
    serializer_class = IncidenciaSerializer

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Retorna las métricas e indicadores de rendimiento calculados en base de datos.
        """
        total = Incidencia.objects.count()
        pendientes = Incidencia.objects.filter(estado='pendiente').count()
        en_proceso = Incidencia.objects.filter(estado='en_proceso').count()
        resueltas = Incidencia.objects.filter(estado='resuelto').count()

        porcentaje_resolucion = round((resueltas / total) * 100, 1) if total > 0 else 0

        ahora = timezone.now()
        proximas_24h = ahora + timedelta(hours=24)

        # Regla: Las incidencias resueltas NO deben mostrarse como vencidas
        vencidas = Incidencia.objects.filter(
            ~Q(estado='resuelto'),
            fecha_limite__isnull=False,
            fecha_limite__lt=ahora
        ).count()

        proximas_a_vencer = Incidencia.objects.filter(
            ~Q(estado='resuelto'),
            fecha_limite__isnull=False,
            fecha_limite__gte=ahora,
            fecha_limite__lte=proximas_24h
        ).count()

        # Distribución por prioridad
        por_prioridad = {
            'alta': Incidencia.objects.filter(prioridad='alta').count(),
            'media': Incidencia.objects.filter(prioridad='media').count(),
            'baja': Incidencia.objects.filter(prioridad='baja').count(),
        }

        # Distribución por categoría
        por_categoria = {
            'hardware': Incidencia.objects.filter(categoria='hardware').count(),
            'software': Incidencia.objects.filter(categoria='software').count(),
            'red': Incidencia.objects.filter(categoria='red').count(),
        }

        return Response({
            'total': total,
            'por_estado': {
                'pendiente': pendientes,
                'en_proceso': en_proceso,
                'resuelto': resueltas,
            },
            'pendientes': pendientes,
            'en_proceso': en_proceso,
            'resueltas': resueltas,
            'porcentaje_resolucion': porcentaje_resolucion,
            'vencidas': vencidas,
            'proximas_a_vencer': proximas_a_vencer,
            'por_prioridad': por_prioridad,
            'por_categoria': por_categoria,
        })

    @action(detail=True, methods=['get', 'post'])
    def comentarios(self, request, pk=None):
        """
        GET /api/incidencias/{id}/comentarios/ -> Obtener comentarios de una incidencia
        POST /api/incidencias/{id}/comentarios/ -> Agregar comentario a la incidencia
        """
        incidencia = self.get_object()

        if request.method == 'POST':
            data = request.data.copy()
            data['incidencia'] = incidencia.id
            serializer = ComentarioSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        comentarios = incidencia.comentarios.all().order_by('creado_en')
        serializer = ComentarioSerializer(comentarios, many=True)
        return Response(serializer.data)


class ComentarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet independiente para Comentarios:
    Permite GET /api/comentarios/?incidencia=1 y POST /api/comentarios/
    """
    queryset = Comentario.objects.all().select_related('incidencia').order_by('creado_en')
    serializer_class = ComentarioSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        incidencia_id = self.request.query_params.get('incidencia')
        if incidencia_id:
            qs = qs.filter(incidencia_id=incidencia_id)
        return qs
