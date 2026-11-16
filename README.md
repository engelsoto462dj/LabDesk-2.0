# LabDesk 2.0 — Sistema de Seguimiento de Incidencias con Plazos y Comentarios
> **SENATI — Dirección Zonal Lima - Callao / CFP Lima Norte**  
> **Escuela de Tecnologías de la Información (ETI)**  
> **Carrera:** Desarrollo de Software / Semestre V  
> **Práctica Domiciliaria:** LabDesk 2.0 (Full Stack: Django REST Framework + React 19 + SQLite)

---

## Descripción del Proyecto

**LabDesk 2.0** es la evolución integral del sistema de gestión de incidencias de laboratorio desarrollado en clase. Permite realizar seguimiento técnico en tiempo real, asignación de responsables, control estricto de fechas límite (SLA) con alertas visuales de vencimiento, historial cronológico de comentarios por incidencia y un dashboard ejecutivo con métricas reales calculadas desde SQLite.

Diseñado bajo las pautas de **Apple Human Interface Guidelines (macOS / iOS)**: interfaz limpia, tipografía legible del sistema, micro-interacciones suaves, tarjetas translúcidas con blur y componentes nativos sin dependencias pesadas.

---

## Requisitos Previos

- **Python 3.10+** (recomendado Python 3.12 o 3.14)
- **Node.js 18+** o **20+** y **npm**
- **Git**

---

## Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```powershell
git clone https://github.com/engelsoto462dj/LabDesk-2.0.git
cd LabDesk-2.0
```

### 2. Configurar y Ejecutar el Backend (Django REST Framework)
Abre una terminal PowerShell en la raíz del proyecto:
```powershell
# Ingresar a la carpeta backend
cd backend

# Activar el entorno virtual existente o crear uno nuevo:
# En Windows PowerShell:
.\venv\Scripts\Activate.ps1
# (Si no existe entorno virtual: python -m venv venv y luego pip install -r requirements.txt)

# Aplicar las migraciones de base de datos a SQLite
python manage.py migrate

# Poblar la base de datos con las incidencias y comentarios de prueba obligatorios
python semillas.py

# Iniciar el servidor backend
python manage.py runserver
```
El servidor backend quedará disponible en:  
 **http://127.0.0.1:8000/api/incidencias/**

---

### 3. Configurar y Ejecutar el Frontend (React 19 + Vite)
Abre una segunda terminal PowerShell:
```powershell
# Ingresar a la carpeta frontend
cd frontend

# Instalar dependencias si es la primera vez (opcional si ya existe node_modules)
npm install

# Iniciar el servidor de desarrollo
npm run dev
```
La aplicación web se abrirá en:  
 **http://127.0.0.1:5173/**

---

## Endpoints de la API REST (Django REST Framework)

| Método | Endpoint | Descripción | Estado HTTP |
|---|---|---|---|
| **GET** | `/api/incidencias/` | Listar incidencias con comentarios incluidos y estado de vencimiento | `200 OK` |
| **POST** | `/api/incidencias/` | Registrar nueva incidencia (con responsable, ubicación y fecha límite) | `201 Created` |
| **GET** | `/api/incidencias/{id}/` | Detalle completo de una incidencia con su historial de comentarios | `200 OK` |
| **PUT** | `/api/incidencias/{id}/` | Modificar datos completos de una incidencia | `200 OK` |
| **PATCH** | `/api/incidencias/{id}/` | Cambio rápido de estado (`pendiente`, `en_proceso`, `resuelto`) | `200 OK` |
| **DELETE** | `/api/incidencias/{id}/` | Eliminar incidencia de la base de datos | `204 No Content` |
| **GET** | `/api/incidencias/dashboard/` | Métricas agregadas (totales, % de resolución, vencidas, prioridades) | `200 OK` |
| **GET** | `/api/incidencias/{id}/comentarios/` | Consultar comentarios de una incidencia específica | `200 OK` |
| **POST** | `/api/incidencias/{id}/comentarios/` | Registrar un nuevo comentario con fecha/hora en la incidencia | `201 Created` |
| **GET** | `/api/comentarios/?incidencia={id}` | Listado de comentarios filtrados por incidencia | `200 OK` |

---

## Cumplimiento de Criterios de Evaluación (Rúbrica de 20 Puntos)

### 1. Responsables, Ubicación y Fecha Límite (4 pts)
- **Modelo Extendido:** Campos `responsable`, `ubicacion` y `fecha_limite` integrados en el modelo `Incidencia`.
- **Formularios React:** Formulario modal de creación y edición con inputs dedicados para técnico asignado, aula/ubicación y selector nativo de fecha y hora (`datetime-local`).
- **Visualización:** Tarjetas con badges informativos que muestran responsable con icono de usuario, ubicación con pin y fecha límite formateada.

### 2. Historial de Comentarios por Incidencia (5 pts)
- **Modelo `Comentario`:** Relacionado mediante `ForeignKey` a `Incidencia`, con campos `autor`, `texto` y `creado_en` (`auto_now_add=True`).
- **Vista de Detalle (Sheet Modal):** Ventana de inspección completa estilo iOS que lista cronológicamente las intervenciones técnicas con avatar, autor, fecha y hora formateada.
- **Registro Inmediato:** Formulario integrado en la vista de detalle para añadir comentarios que se persisten al instante en SQLite vía `POST` y actualizan la vista sin recargar.

### 3. Alertas por Vencimiento (4 pts)
- **Incidencias Vencidas:** Si `fecha_limite` ya pasó y el estado no es resuelto, se muestra un badge en rojo brillante con indicador pulsante y conteo del retraso (ej. `Venció hace 2 d`).
- **Próximas a Vencer:** Aquellas que vencen en las próximas 24 horas y no están resueltas se destacan con badge ámbar/naranja (ej. `Vence en 8 h`).
- **Regla Estricta:** Una incidencia con estado **Resuelto** nunca se muestra como vencida (aparece con badge verde `Resuelta`).
- **Filtros Rápidos:** Botones en el Segmented Control para ver inmediatamente las incidencias ` Vencidas` y ` Por vencer`.

### 4. Dashboard con Datos Reales (4 pts)
- **Pestaña Ejecutiva:** Vista conmutador en la barra superior entre ` Incidencias` y ` Dashboard`.
- **Porcentaje de Resolución:** `(resueltas / total) × 100` (o `0%` si el total es 0) visualizado con un gráfico circular SVG animado estilo Apple Activity Ring.
- **Indicadores Clave:** Total de incidencias, desglose por estado (Pendiente, En Proceso, Resuelto), incidencias vencidas y próximas.
- **Distribuciones Gráficas:** Barras horizontales proporcionales estilo iOS Screen Time por Nivel de Prioridad (Alta, Media, Baja) y por Categoría Técnica (Hardware, Software, Red).

### 5. Calidad Técnica y Presentación (3 pts)
- Validaciones en formulario con resaltado visual en rojo de campos requeridos vacíos.
- Estados de carga en botones (`Guardando...`, `Sincronizando...`).
- Manejo de excepciones de red y mensajes de error con opción de reintento.
- Persistencia real demostrable: todos los cambios persisten al recargar el navegador.
- Diseño 100% responsivo para teléfonos y pantallas de escritorio.
- Exportación a formato CSV delimitado por `;` con codificación UTF-8 BOM para apertura directa en Microsoft Excel.

---

## Datos de Prueba Iniciales (Semillas)

El script `semillas.py` carga automáticamente las 5 incidencias oficiales con sus comentarios:
1. **PC no enciende** — Hardware — Alta — **Pendiente** (Vencida, hace 2 días) — 2 comentarios.
2. **Python no abre** — Software — Media — **En proceso** (Próxima a vencer, en 8 horas) — 2 comentarios.
3. **Wi-Fi lento** — Red — Alta — **Pendiente** (En plazo, en 3 días) — 1 comentario.
4. **Teclado defectuoso** — Hardware — Baja — **Resuelto** (Fecha pasada pero estado Resuelto: no vence) — 2 comentarios.
5. **Navegador desactualizado** — Software — Media — **Resuelto** (Resuelta a tiempo) — 1 comentario.

Para resembrar los datos en cualquier momento:
```powershell
cd backend
python semillas.py
```

---

##Estructura Sugerida para el Video Demostrativo (3 a 5 min)

1. **Introducción (30 seg):** Presentación del estudiante, nombre del proyecto LabDesk 2.0 y explicación de la arquitectura (Django REST Framework en puerto 8000 + React 19 en puerto 5173 con SQLite).
2. **Responsables, Ubicación y Fechas Límite (1 min):** Crear una nueva incidencia asignando un responsable, aula y fecha límite. Mostrar cómo aparece en el listado y cómo se edita.
3. **Alertas de Vencimiento (45 seg):** Explicar el badge rojo de "Vencida" en incidencias vencidas no resueltas, el badge ámbar de "Próxima a vencer" (< 24h), y demostrar que al marcar una vencida como "Resuelta", la alerta se quita y pasa a verde.
4. **Historial de Comentarios (1 min):** Abrir el modal de detalle de una incidencia, revisar los comentarios existentes y escribir un nuevo comentario técnico. Mostrar cómo se añade inmediatamente sin recargar.
5. **Dashboard de Estadísticas (45 seg):** Cambiar a la pestaña "Dashboard", mostrar el cálculo del `% de resolución`, la distribución por prioridad y categoría, y recargar la página (`F5`) para verificar que todos los datos permanecen intactos en SQLite.
