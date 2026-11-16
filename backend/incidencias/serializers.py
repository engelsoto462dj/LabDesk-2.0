# SENATI - V Semestre: Serializadores para LabDesk 2.0
from rest_framework import serializers
from .models import Incidencia, Comentario

class ComentarioSerializer(serializers.ModelSerializer):
    creado_en_formato = serializers.SerializerMethodField()

    class Meta:
        model = Comentario
        fields = ['id', 'incidencia', 'autor', 'texto', 'creado_en', 'creado_en_formato']
        read_only_fields = ['id', 'creado_en', 'creado_en_formato']

    def get_creado_en_formato(self, obj):
        if not obj.creado_en:
            return ""
        return obj.creado_en.strftime("%d/%m/%Y %H:%M")


class IncidenciaSerializer(serializers.ModelSerializer):
    comentarios = ComentarioSerializer(many=True, read_only=True)
    estado_vencimiento = serializers.ReadOnlyField()
    total_comentarios = serializers.IntegerField(source='comentarios.count', read_only=True)

    class Meta:
        model = Incidencia
        fields = [
            'id',
            'titulo',
            'descripcion',
            'categoria',
            'prioridad',
            'estado',
            'aula',
            'responsable',
            'ubicacion',
            'fecha_limite',
            'creado_en',
            'actualizado_en',
            'estado_vencimiento',
            'total_comentarios',
            'comentarios'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'estado_vencimiento', 'total_comentarios', 'comentarios']
