import os
import django
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from incidencias.models import Incidencia, Comentario

ahora = timezone.now()

datos_prueba = [
    {
        "titulo": "PC 08 no enciende - Posible falla de fuente",
        "descripcion": "La estación de trabajo número 08 del laboratorio de desarrollo no responde al pulsar el botón de encendido. Se revisó el cable de poder y el tomacorriente estabilizado.",
        "categoria": "hardware",
        "prioridad": "alta",
        "estado": "pendiente",
        "aula": "Lab 302",
        "ubicacion": "Lab 302 - Estación 08",
        "responsable": "Carlos Mendoza",
        "fecha_limite": ahora - timedelta(days=2), # VENCIDA
        "comentarios": [
            {
                "autor": "Prof. Alejandro Ruiz",
                "texto": "Reportado durante la sesión práctica matutina. El alumno no pudo continuar el laboratorio."
            },
            {
                "autor": "Carlos Mendoza",
                "texto": "Se acudió al aula a verificar. Se constató que la fuente de 500W está inoperativa. Se solicitó reemplazo a soporte técnico central."
            }
        ]
    },
    {
        "titulo": "Pérdida de paquetes en Switch Core de Red",
        "descripcion": "Intermitencia alta y pérdida del 35% de paquetes en los laboratorios 301 y 302 durante las descargas de dependencias npm y paquetes pip.",
        "categoria": "red",
        "prioridad": "alta",
        "estado": "en_proceso",
        "aula": "Lab 301",
        "ubicacion": "Lab 301 - Rack Principal A",
        "responsable": "Lucía Paredes",
        "fecha_limite": ahora + timedelta(hours=8), # PRÓXIMA A VENCER (< 24h)
        "comentarios": [
            {
                "autor": "Lucía Paredes",
                "texto": "Se realizó test de conectividad y ping sostenido a la puerta de enlace. Se observa congestión en el puerto uplink gigabit."
            },
            {
                "autor": "Lucía Paredes",
                "texto": "Se reinició el switch secundario y se está balanceando la carga en la VLAN 20 de estudiantes."
            }
        ]
    },
    {
        "titulo": "Instalación de entorno iOS / Xcode y simulador",
        "descripcion": "Se requiere desplegar el simulador de iOS y la suite de desarrollo en las iMac del taller de cómputo para el taller de móviles.",
        "categoria": "software",
        "prioridad": "media",
        "estado": "pendiente",
        "aula": "Taller Mac",
        "ubicacion": "Taller Mac - Estación 04",
        "responsable": "Marco Rivera",
        "fecha_limite": ahora + timedelta(days=3), # A TIEMPO
        "comentarios": [
            {
                "autor": "Marco Rivera",
                "texto": "Descarga de imagen de macOS e instaladores iniciada en el servidor local de imágenes."
            }
        ]
    },
    {
        "titulo": "Teclado mecánico con teclas bloqueadas",
        "descripcion": "La barra espaciadora y las teclas de cursor presentan atascamiento continuo por polvo y uso intensivo en la estación 12.",
        "categoria": "hardware",
        "prioridad": "baja",
        "estado": "resuelto",
        "aula": "Lab 204",
        "ubicacion": "Lab 204 - Estación 12",
        "responsable": "Ana Valdivia",
        "fecha_limite": ahora - timedelta(days=1), # FECHA PASADA PERO RESUELTO -> NO DEBE MOSTRARSE VENCIDA
        "comentarios": [
            {
                "autor": "Ana Valdivia",
                "texto": "Se desmontó el teclado averiado y se reemplazó por un periférico nuevo del inventario de Senati."
            },
            {
                "autor": "Prof. Carmen Soto",
                "texto": "Verificado y operativo al 100% en la clase de la tarde."
            }
        ]
    },
    {
        "titulo": "Actualización de Node.js v24 y extensiones VS Code",
        "descripcion": "Se requiere actualizar los entornos de desarrollo para la clase de Full Stack y permitir la depuración de React 19.",
        "categoria": "software",
        "prioridad": "media",
        "estado": "resuelto",
        "aula": "Lab 302",
        "ubicacion": "Lab 302 - Computadoras 01 a 20",
        "responsable": "Carlos Mendoza",
        "fecha_limite": ahora + timedelta(days=1), # RESUELTO A TIEMPO
        "comentarios": [
            {
                "autor": "Carlos Mendoza",
                "texto": "Script de despliegue automatizado ejecutado vía PowerShell en las 20 terminales del aula."
            }
        ]
    },
    {
        "titulo": "Proyector interactivo pierde señal HDMI",
        "descripcion": "El proyector principal del auditorio se apaga o pierde señal intermitentemente tras 15 minutos de presentación continua.",
        "categoria": "hardware",
        "prioridad": "alta",
        "estado": "en_proceso",
        "aula": "Auditorio Central",
        "ubicacion": "Auditorio Central - Cabina Multimedia",
        "responsable": "Lucía Paredes",
        "fecha_limite": ahora + timedelta(hours=14), # PRÓXIMA A VENCER (< 24h)
        "comentarios": [
            {
                "autor": "Lucía Paredes",
                "texto": "Se reemplazó el cable HDMI por uno blindado categoría 2.0. En observación térmica por posible sobrecalentamiento de la lámpara."
            }
        ]
    }
]

print("Limpiando e insertando datos de prueba para LabDesk 2.0...")
# Opcional: limpiar anteriores para consistencia
Incidencia.objects.all().delete()

for d in datos_prueba:
    comentarios_data = d.pop("comentarios", [])
    incidencia = Incidencia.objects.create(**d)
    print(f" [+] Creada: {incidencia.titulo} | Responsable: {incidencia.responsable} | Estado: {incidencia.estado} | Vencimiento: {incidencia.estado_vencimiento}")
    
    for c in comentarios_data:
        Comentario.objects.create(
            incidencia=incidencia,
            autor=c["autor"],
            texto=c["texto"]
        )
    print(f"     -> {len(comentarios_data)} comentarios agregados.")

print(f"\nTotal incidencias registradas en SQLite: {Incidencia.objects.count()}")
print(f"Total comentarios registrados: {Comentario.objects.count()}")
