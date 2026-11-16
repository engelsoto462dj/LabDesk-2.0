import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from incidencias.models import Incidencia, Comentario

ahora = timezone.now()

# 5 incidencias originales de la práctica de clase adaptadas con los nuevos requerimientos de LabDesk 2.0
datos_prueba = [
    {
        "titulo": "PC no enciende",
        "descripcion": "La máquina número 08 del laboratorio no responde al botón de encendido. Fuente de poder revisada.",
        "categoria": "hardware",
        "prioridad": "alta",
        "estado": "pendiente",
        "aula": "Lab 302",
        "ubicacion": "Lab 302 - Estación 08",
        "responsable": "Carlos Mendoza",
        "fecha_limite": ahora - timedelta(days=2),  # Vencida (plazo superado y estado pendiente)
        "comentarios": [
            {
                "autor": "Soporte Técnico",
                "texto": "Se verificó cableado y tomacorriente del módulo 08."
            },
            {
                "autor": "Carlos Mendoza",
                "texto": "Falla confirmada en la fuente de poder. Se solicitó repuesto al almacén técnico."
            }
        ]
    },
    {
        "titulo": "Python no abre",
        "descripcion": "El entorno virtual de Python 3.12 arroja error de PATH al intentar ejecutar desde PowerShell.",
        "categoria": "software",
        "prioridad": "media",
        "estado": "en_proceso",
        "aula": "Lab 301",
        "ubicacion": "Lab 301 - Estación 14",
        "responsable": "Lucía Paredes",
        "fecha_limite": ahora + timedelta(hours=8),  # Próxima a vencer (< 24 horas y no resuelta)
        "comentarios": [
            {
                "autor": "Profesor a cargo",
                "texto": "Alumnos de la sesión de la tarde no pueden correr scripts de práctica."
            },
            {
                "autor": "Lucía Paredes",
                "texto": "Reconfigurando variables de entorno de sistema en las máquinas del aula."
            }
        ]
    },
    {
        "titulo": "Wi-Fi lento",
        "descripcion": "Pérdida de paquetes en el Access Point del laboratorio durante la descarga de paquetes npm.",
        "categoria": "red",
        "prioridad": "alta",
        "estado": "pendiente",
        "aula": "Taller Mac",
        "ubicacion": "Taller Mac - AP 02",
        "responsable": "Marco Rivera",
        "fecha_limite": ahora + timedelta(days=3),  # En plazo
        "comentarios": [
            {
                "autor": "Marco Rivera",
                "texto": "Se programó reinicio de access point y análisis de canales de frecuencia."
            }
        ]
    },
    {
        "titulo": "Teclado defectuoso",
        "descripcion": "La tecla espaciadora y las flechas no responden en la estación de trabajo 12.",
        "categoria": "hardware",
        "prioridad": "baja",
        "estado": "resuelto",
        "aula": "Lab 204",
        "ubicacion": "Lab 204 - Estación 12",
        "responsable": "Ana Valdivia",
        "fecha_limite": ahora - timedelta(days=1),  # Fecha pasada pero Resuelto: NO se muestra como vencida
        "comentarios": [
            {
                "autor": "Ana Valdivia",
                "texto": "Teclado USB reemplazado por una unidad operativa del inventario."
            },
            {
                "autor": "Ana Valdivia",
                "texto": "Pruebas de escritura completadas exitosamente."
            }
        ]
    },
    {
        "titulo": "Navegador desactualizado",
        "descripcion": "Google Chrome requiere actualización para soportar las nuevas herramientas de desarrollo de React 19.",
        "categoria": "software",
        "prioridad": "media",
        "estado": "resuelto",
        "aula": "Lab 302",
        "ubicacion": "Lab 302 - Todas las terminales",
        "responsable": "Carlos Mendoza",
        "fecha_limite": ahora + timedelta(days=2),  # Resuelta a tiempo
        "comentarios": [
            {
                "autor": "Carlos Mendoza",
                "texto": "Actualización masiva ejecutada en las 24 estaciones de trabajo del aula 302."
            }
        ]
    }
]

print("Cargando las 5 incidencias oficiales de SENATI...")
Incidencia.objects.all().delete()

for d in datos_prueba:
    comentarios = d.pop("comentarios", [])
    incidencia = Incidencia.objects.create(**d)
    print(f" [+] Creada: {incidencia.titulo} | {incidencia.get_estado_display()} | Vencimiento: {incidencia.estado_vencimiento}")
    for c in comentarios:
        Comentario.objects.create(
            incidencia=incidencia,
            autor=c["autor"],
            texto=c["texto"]
        )

print(f"\nTotal incidencias registradas en SQLite: {Incidencia.objects.count()}")
print(f"Total comentarios registrados: {Comentario.objects.count()}")
