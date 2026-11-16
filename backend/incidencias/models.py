# SENATI - CFP LIMA NORTE / SEDE CENTRAL
# Carrera: Desarrollo de Software - Semestre V
# Taller Full Stack: LabDesk 2.0 - Sistema de Gestion de Incidencias

from django.db import models
from django.utils import timezone
from datetime import timedelta

class Incidencia(models.Model):
    CATEGORIAS = [
        ('hardware', 'Hardware'),
        ('software', 'Software'),
        ('red', 'Red / Internet'),
    ]
    PRIORIDADES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En proceso'),
        ('resuelto', 'Resuelto'),
    ]

    titulo = models.CharField(max_length=120, help_text="Título breve del problema")
    descripcion = models.TextField(help_text="Detalle del problema encontrado")
    categoria = models.CharField(
        max_length=20, choices=CATEGORIAS, default='hardware'
    )
    prioridad = models.CharField(
        max_length=10, choices=PRIORIDADES, default='media'
    )
    estado = models.CharField(
        max_length=20, choices=ESTADOS, default='pendiente'
    )
    aula = models.CharField(
        max_length=50, default='Lab 302', blank=True,
        help_text="Laboratorio o ambiente del SENATI donde ocurrió la falla"
    )
    # Nuevos campos obligatorios para LabDesk 2.0
    responsable = models.CharField(
        max_length=100, blank=True, default='',
        help_text="Persona o técnico responsable de la incidencia"
    )
    ubicacion = models.CharField(
        max_length=120, blank=True, default='',
        help_text="Ubicación detallada (ej. Lab 302 - PC 14)"
    )
    fecha_limite = models.DateTimeField(
        null=True, blank=True,
        help_text="Fecha y hora límite de resolución"
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'Incidencia'
        verbose_name_plural = 'Incidencias'

    def __str__(self):
        ubicacion_txt = self.ubicacion or self.aula or "Sin ubicación"
        return f"[{ubicacion_txt}] {self.titulo} ({self.get_estado_display()})"

    @property
    def estado_vencimiento(self):
        """
        Calcula el estado del plazo:
        - 'resuelta': si el estado es 'resuelto' (nunca se muestra como vencida)
        - 'sin_fecha': si no tiene fecha límite
        - 'vencida': si fecha_limite < ahora y no resuelta
        - 'proxima': si vence dentro de las próximas 24 horas y no resuelta
        - 'a_tiempo': si vence en más de 24 horas
        """
        if self.estado == 'resuelto':
            return 'resuelta'
        if not self.fecha_limite:
            return 'sin_fecha'
        
        ahora = timezone.now()
        if self.fecha_limite < ahora:
            return 'vencida'
        elif self.fecha_limite <= ahora + timedelta(hours=24):
            return 'proxima'
        return 'a_tiempo'


class Comentario(models.Model):
    incidencia = models.ForeignKey(
        Incidencia,
        on_delete=models.CASCADE,
        related_name='comentarios',
        help_text="Incidencia a la que pertenece este comentario"
    )
    autor = models.CharField(
        max_length=100,
        default='Soporte Técnico',
        help_text="Nombre de quien registra el comentario"
    )
    texto = models.TextField(
        help_text="Mensaje, novedad o acción realizada"
    )
    creado_en = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha y hora de creación"
    )

    class Meta:
        ordering = ['creado_en']
        verbose_name = 'Comentario'
        verbose_name_plural = 'Comentarios'

    def __str__(self):
        return f"Comentario de {self.autor} en #{self.incidencia_id} ({self.creado_en.strftime('%d/%m/%Y %H:%M')})"
