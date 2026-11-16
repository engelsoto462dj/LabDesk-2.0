from django.contrib import admin
from .models import Incidencia, Comentario

class ComentarioInline(admin.TabularInline):
    model = Comentario
    extra = 1

@admin.register(Incidencia)
class IncidenciaAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'categoria', 'prioridad', 'estado', 'responsable', 'ubicacion', 'fecha_limite', 'creado_en')
    list_filter = ('estado', 'prioridad', 'categoria')
    search_fields = ('titulo', 'descripcion', 'responsable', 'ubicacion', 'aula')
    inlines = [ComentarioInline]

@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'incidencia', 'autor', 'texto', 'creado_en')
    list_filter = ('creado_en', 'autor')
    search_fields = ('autor', 'texto')
