/**
 * ==============================================================================
 * SENATI - DIRECCION ZONAL LIMA - CALLAO
 * ESCUELA DE TECNOLOGIAS DE LA INFORMACION (ETI)
 * CARRERA: DESARROLLO DE SOFTWARE - SEMESTRE V
 *
 * PROYECTO: LabDesk 2.0 - Sistema de Seguimiento de Incidencias de Cómputo
 * TECNOLOGÍAS: React 19 + Vite + Django REST Framework + SQLite
 *
 * CARACTERÍSTICAS OBLIGATORIAS:
 * 1. Asignación de responsables, ubicación y fechas límite.
 * 2. Historial de comentarios con fecha/hora por incidencia.
 * 3. Alertas de vencimiento (Vencida en rojo, Próxima a vencer en ámbar, Resueltas limpias).
 * 4. Dashboard interactivo con datos reales de Django SQLite y % de resolución.
 * 5. Validaciones, persistencia real, estados de carga y diseño Apple HIG.
 * ==============================================================================
 */

import { useEffect, useState, useMemo } from 'react'
import './App.css'

// URL base de la API REST local expuesta por Django REST Framework
const API = 'http://127.0.0.1:8000/api/incidencias/'
const API_COMENTARIOS = 'http://127.0.0.1:8000/api/comentarios/'

// Estado inicial del formulario vacío
const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  categoria: 'hardware',
  prioridad: 'media',
  estado: 'pendiente',
  aula: 'Lab 302',
  responsable: '',
  ubicacion: '',
  fecha_limite: ''
}

export default function App() {
  // -------------------------------------------------------------
  // ESTADOS DEL COMPONENTE
  // -------------------------------------------------------------
  const [vistaActiva, setVistaActiva] = useState('listado') // 'listado' | 'dashboard'
  const [datos, setDatos] = useState([])
  const [form, setForm] = useState(FORM_INICIAL)
  const [editando, setEditando] = useState(null)
  const [incidenciaDetalle, setIncidenciaDetalle] = useState(null)
  const [nuevoComentario, setNuevoComentario] = useState({ autor: 'Soporte Técnico', texto: '' })
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'pendiente' | 'en_proceso' | 'resuelto' | 'vencidas' | 'proximas'
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [orden, setOrden] = useState('recientes') // 'recientes' | 'antiguos' | 'prioridad' | 'fecha_limite'

  // Estados de carga y validación
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [erroresValidacion, setErroresValidacion] = useState({})
  const [notificacion, setNotificacion] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  // -------------------------------------------------------------
  // TOAST NOTIFICATION ESTILO APPLE
  // -------------------------------------------------------------
  function mostrarToast(mensaje, tipo = 'exito') {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => {
      setNotificacion(null)
    }, 3400)
  }

  // -------------------------------------------------------------
  // CONSUMO DE API: GET /api/incidencias/
  // -------------------------------------------------------------
  async function cargar() {
    setCargando(true)
    try {
      const res = await fetch(API)
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status} al consultar la API de Django`)
      }
      const data = await res.json()
      setDatos(data)
      setError('')

      // Si el modal de detalle está abierto, refrescar la incidencia seleccionada
      if (incidenciaDetalle) {
        const actualizada = data.find(item => item.id === incidenciaDetalle.id)
        if (actualizada) {
          setIncidenciaDetalle(actualizada)
        }
      }
    } catch (err) {
      console.error('Error al conectar con backend Django:', err)
      setError('No se pudo conectar con Django en http://127.0.0.1:8000. Verifica que el servidor esté activo.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  // -------------------------------------------------------------
  // CÁLCULO DE ALERTAS DE VENCIMIENTO
  // -------------------------------------------------------------
  function obtenerEstadoVencimiento(item) {
    if (!item) return { tipo: 'sin_fecha', texto: 'Sin fecha', badgeClass: 'a_tiempo', detalle: '' }

    // Regla obligatoria: Una incidencia resuelta NO debe mostrarse como vencida
    if (item.estado === 'resuelto') {
      return {
        tipo: 'resuelta',
        texto: 'Resuelta',
        badgeClass: 'resuelta_badge',
        detalle: 'Completada a tiempo'
      }
    }

    if (!item.fecha_limite) {
      return {
        tipo: 'sin_fecha',
        texto: 'Sin fecha límite',
        badgeClass: 'a_tiempo',
        detalle: 'Sin plazo definido'
      }
    }

    const fechaLimiteMs = new Date(item.fecha_limite).getTime()
    const ahoraMs = Date.now()
    const diffMs = fechaLimiteMs - ahoraMs

    // Si ya pasó la fecha límite y no está resuelta -> Vencida (rojo)
    if (diffMs < 0) {
      const horasVencidas = Math.abs(Math.round(diffMs / (1000 * 60 * 60)))
      const diasVencidos = Math.floor(horasVencidas / 24)
      const textoDetalle = diasVencidos > 0 ? `Venció hace ${diasVencidos} d` : `Venció hace ${horasVencidas} h`
      return {
        tipo: 'vencida',
        texto: 'Vencida',
        badgeClass: 'vencida',
        detalle: textoDetalle
      }
    }

    // Si vence en las próximas 24 horas y no está resuelta -> Próxima a vencer (naranja/ámbar)
    const veinticuatroHorasMs = 24 * 60 * 60 * 1000
    if (diffMs <= veinticuatroHorasMs) {
      const horasRestantes = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
      return {
        tipo: 'proxima',
        texto: 'Próxima a vencer',
        badgeClass: 'proxima',
        detalle: `Vence en ${horasRestantes} h`
      }
    }

    // Vence en más de 24 horas
    const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return {
      tipo: 'a_tiempo',
      texto: 'A tiempo',
      badgeClass: 'a_tiempo',
      detalle: `Plazo: ${diasRestantes} d`
    }
  }

  // -------------------------------------------------------------
  // KPI / ESTADÍSTICAS EN TIEMPO REAL
  // -------------------------------------------------------------
  const metricas = useMemo(() => {
    const total = datos.length
    const pendientes = datos.filter(x => x.estado === 'pendiente').length
    const enProceso = datos.filter(x => x.estado === 'en_proceso').length
    const resueltos = datos.filter(x => x.estado === 'resuelto').length

    // Porcentaje de resolución = (resueltas / total) * 100; si el total es 0, mostrar 0 %
    const porcentajeResolucion = total > 0 ? Math.round((resueltos / total) * 100) : 0

    // Vencidas y próximas a vencer con reglas estrictas
    let vencidas = 0
    let proximas = 0

    datos.forEach(item => {
      const estadoVenc = obtenerEstadoVencimiento(item)
      if (estadoVenc.tipo === 'vencida') vencidas++
      if (estadoVenc.tipo === 'proxima') proximas++
    })

    // Distribución por prioridad
    const alta = datos.filter(x => x.prioridad === 'alta').length
    const media = datos.filter(x => x.prioridad === 'media').length
    const baja = datos.filter(x => x.prioridad === 'baja').length

    // Distribución por categoría
    const hardware = datos.filter(x => x.categoria === 'hardware').length
    const software = datos.filter(x => x.categoria === 'software').length
    const red = datos.filter(x => x.categoria === 'red').length

    return {
      total,
      pendientes,
      enProceso,
      resueltos,
      porcentajeResolucion,
      vencidas,
      proximas,
      prioridades: { alta, media, baja },
      categorias: { hardware, software, red }
    }
  }, [datos])

  // -------------------------------------------------------------
  // FILTRADO Y ORDENACIÓN
  // -------------------------------------------------------------
  const incidenciasFiltradas = useMemo(() => {
    return datos
      .filter(item => {
        const query = busqueda.toLowerCase().trim()
        const coincideTexto =
          item.titulo.toLowerCase().includes(query) ||
          item.descripcion.toLowerCase().includes(query) ||
          (item.responsable && item.responsable.toLowerCase().includes(query)) ||
          (item.ubicacion && item.ubicacion.toLowerCase().includes(query)) ||
          (item.aula && item.aula.toLowerCase().includes(query))

        const venc = obtenerEstadoVencimiento(item)

        let coincideEstado = true
        if (filtroEstado === 'todos') {
          coincideEstado = true
        } else if (filtroEstado === 'vencidas') {
          coincideEstado = venc.tipo === 'vencida'
        } else if (filtroEstado === 'proximas') {
          coincideEstado = venc.tipo === 'proxima'
        } else {
          coincideEstado = item.estado === filtroEstado
        }

        const coincidePrioridad = filtroPrioridad === 'todas' || item.prioridad === filtroPrioridad
        const coincideCategoria = filtroCategoria === 'todas' || item.categoria === filtroCategoria

        return coincideTexto && coincideEstado && coincidePrioridad && coincideCategoria
      })
      .sort((a, b) => {
        if (orden === 'recientes') {
          return new Date(b.creado_en || 0) - new Date(a.creado_en || 0) || b.id - a.id
        }
        if (orden === 'antiguos') {
          return new Date(a.creado_en || 0) - new Date(b.creado_en || 0) || a.id - b.id
        }
        if (orden === 'prioridad') {
          const pesos = { alta: 3, media: 2, baja: 1 }
          return (pesos[b.prioridad] || 0) - (pesos[a.prioridad] || 0)
        }
        if (orden === 'fecha_limite') {
          if (!a.fecha_limite) return 1
          if (!b.fecha_limite) return -1
          return new Date(a.fecha_limite) - new Date(b.fecha_limite)
        }
        return 0
      })
  }, [datos, busqueda, filtroEstado, filtroPrioridad, filtroCategoria, orden])

  // -------------------------------------------------------------
  // CONTROLADOR DEL FORMULARIO DE INCIDENCIA
  // -------------------------------------------------------------
  function manejarCambio(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (erroresValidacion[name]) {
      setErroresValidacion(prev => ({ ...prev, [name]: null }))
    }
  }

  function aInputDateTime(isoString) {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ''
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${mins}`
    } catch {
      return ''
    }
  }

  function abrirNuevaIncidencia() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErroresValidacion({})
    setError('')
    setMostrarModal(true)
  }

  function iniciarEdicion(item) {
    setEditando(item.id)
    setForm({
      titulo: item.titulo || '',
      descripcion: item.descripcion || '',
      categoria: item.categoria || 'hardware',
      prioridad: item.prioridad || 'media',
      estado: item.estado || 'pendiente',
      aula: item.aula || 'Lab 302',
      responsable: item.responsable || '',
      ubicacion: item.ubicacion || item.aula || '',
      fecha_limite: aInputDateTime(item.fecha_limite)
    })
    setErroresValidacion({})
    setError('')
    setMostrarModal(true)
  }

  // Guardar (POST Crear o PUT Editar)
  async function guardar(e) {
    e.preventDefault()

    // Validaciones de campos obligatorios
    const errores = {}
    if (!form.titulo.trim()) {
      errores.titulo = 'El título de la incidencia es obligatorio'
    }
    if (!form.descripcion.trim()) {
      errores.descripcion = 'La descripción del problema es obligatoria'
    }

    if (Object.keys(errores).length > 0) {
      setErroresValidacion(errores)
      mostrarToast('Completa los campos obligatorios señalados', 'error')
      return
    }

    setGuardando(true)
    try {
      const url = editando === null ? API : `${API}${editando}/`
      const metodo = editando === null ? 'POST' : 'PUT'

      // Preparar payload con fecha ISO o null
      const payload = {
        ...form,
        ubicacion: form.ubicacion.trim() || form.aula || 'Lab 302',
        aula: form.ubicacion.trim() || form.aula || 'Lab 302',
        fecha_limite: form.fecha_limite ? new Date(form.fecha_limite).toISOString() : null
      }

      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Error al guardar los datos en SQLite')
      }

      const resJson = await res.json()
      const accionTexto = editando === null ? 'registrada con éxito' : 'actualizada'
      mostrarToast(`Incidencia #${resJson.id} ${accionTexto}`, 'exito')

      setMostrarModal(false)
      setForm(FORM_INICIAL)
      setEditando(null)
      await cargar()
    } catch (err) {
      setError(err.message)
      mostrarToast(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // Cambio rápido de estado (PATCH)
  async function actualizarEstado(id, nuevoEstado) {
    try {
      const res = await fetch(`${API}${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })

      if (!res.ok) {
        throw new Error('Error al actualizar el estado de la incidencia')
      }

      const actualizado = await res.json()
      mostrarToast(`Estado cambiado a: ${nuevoEstado.replace('_', ' ')}`, 'info')

      // Actualizar en el estado local de inmediato
      setDatos(prev => prev.map(item => (item.id === id ? { ...item, estado: nuevoEstado, estado_vencimiento: actualizado.estado_vencimiento } : item)))

      if (incidenciaDetalle && incidenciaDetalle.id === id) {
        setIncidenciaDetalle(prev => ({ ...prev, estado: nuevoEstado, estado_vencimiento: actualizado.estado_vencimiento }))
      }
    } catch (err) {
      setError(err.message)
      mostrarToast(err.message, 'error')
    }
  }

  // Eliminar (DELETE)
  async function eliminar(id, titulo) {
    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar la incidencia:\n"${titulo}"?\n\nEsta acción se aplicará directamente en SQLite.`
    )
    if (!confirmacion) return

    try {
      const res = await fetch(`${API}${id}/`, {
        method: 'DELETE'
      })

      if (!res.ok && res.status !== 204) {
        throw new Error('No se pudo eliminar la incidencia')
      }

      mostrarToast('Incidencia eliminada con éxito', 'aviso')
      if (incidenciaDetalle && incidenciaDetalle.id === id) {
        setIncidenciaDetalle(null)
      }
      await cargar()
    } catch (err) {
      setError(err.message)
      mostrarToast(err.message, 'error')
    }
  }

  // -------------------------------------------------------------
  // GESTIÓN DEL DETALLE Y COMENTARIOS
  // -------------------------------------------------------------
  async function abrirDetalle(item) {
    setIncidenciaDetalle(item)
    // Consultar comentarios actualizados directamente desde el endpoint
    try {
      const res = await fetch(`${API}${item.id}/comentarios/`)
      if (res.ok) {
        const comentarios = await res.json()
        setIncidenciaDetalle(prev => ({ ...prev, comentarios }))
      }
    } catch (err) {
      console.warn('Cargando con comentarios en caché:', err)
    }
  }

  async function registrarComentario(e) {
    e.preventDefault()
    if (!incidenciaDetalle) return

    if (!nuevoComentario.texto.trim()) {
      mostrarToast('Escribe un comentario antes de enviar', 'aviso')
      return
    }

    setEnviandoComentario(true)
    try {
      const payload = {
        incidencia: incidenciaDetalle.id,
        autor: nuevoComentario.autor.trim() || 'Soporte Técnico',
        texto: nuevoComentario.texto.trim()
      }

      const res = await fetch(`${API}${incidenciaDetalle.id}/comentarios/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('No se pudo guardar el comentario en la base de datos')
      }

      const comentarioCreado = await res.json()
      mostrarToast('Comentario añadido al historial', 'exito')

      // Actualizar modal de detalle inmediatamente
      setIncidenciaDetalle(prev => ({
        ...prev,
        comentarios: [...(prev.comentarios || []), comentarioCreado],
        total_comentarios: (prev.total_comentarios || 0) + 1
      }))

      // Actualizar en la lista general para que el contador de comentarios se actualice
      setDatos(prev =>
        prev.map(it => {
          if (it.id === incidenciaDetalle.id) {
            return {
              ...it,
              comentarios: [...(it.comentarios || []), comentarioCreado],
              total_comentarios: (it.total_comentarios || 0) + 1
            }
          }
          return it
        })
      )

      // Limpiar texto manteniendo el autor
      setNuevoComentario(prev => ({ ...prev, texto: '' }))
    } catch (err) {
      mostrarToast(err.message, 'error')
    } finally {
      setEnviandoComentario(false)
    }
  }

  // -------------------------------------------------------------
  // EXPORTACIÓN PROFESIONAL A CSV
  // -------------------------------------------------------------
  function exportarCSV() {
    const lista = incidenciasFiltradas.length > 0 ? incidenciasFiltradas : datos
    if (lista.length === 0) {
      mostrarToast('No hay incidencias para exportar', 'aviso')
      return
    }

    function escapar(val) {
      if (val === null || val === undefined) return '""'
      return `"${String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim()}"`
    }

    const cabeceras = [
      'N° ID',
      'TÍTULO',
      'DESCRIPCIÓN',
      'CATEGORÍA',
      'PRIORIDAD',
      'ESTADO',
      'RESPONSABLE',
      'UBICACIÓN',
      'FECHA LÍMITE',
      'ALERTA PLAZO',
      'N° COMENTARIOS',
      'FECHA REGISTRO'
    ]

    const filas = lista.map(it => {
      const venc = obtenerEstadoVencimiento(it)
      return [
        it.id,
        escapar(it.titulo),
        escapar(it.descripcion),
        escapar(it.categoria),
        escapar(it.prioridad),
        escapar(it.estado),
        escapar(it.responsable || 'Sin asignar'),
        escapar(it.ubicacion || it.aula || 'Lab 302'),
        escapar(it.fecha_limite ? new Date(it.fecha_limite).toLocaleString('es-PE') : 'Sin fecha'),
        escapar(venc.texto),
        escapar(it.comentarios ? it.comentarios.length : it.total_comentarios || 0),
        escapar(it.creado_en ? new Date(it.creado_en).toLocaleString('es-PE') : '')
      ]
    })

    const delimitador = ';'
    const contenido = [
      cabeceras.map(escapar).join(delimitador),
      ...filas.map(f => f.join(delimitador))
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `LabDesk2_Incidencias_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    mostrarToast(`Exportadas ${lista.length} incidencias a CSV`, 'exito')
  }

  // Formato de fecha legible
  function formatearFecha(isoString) {
    if (!isoString) return 'Sin fecha'
    try {
      const f = new Date(isoString)
      return f.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="apple-app">
      {/* Toast Notification estilo Dynamic Island */}
      {notificacion && (
        <div className={`apple-toast ${notificacion.tipo}`} role="alert">
          <span className="toast-dot" />
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      {/* Barra de Navegación macOS / iOS Glassmorphism */}
      <nav className="apple-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="apple-logo-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="brand-titles">
              <div className="brand-row">
                <span className="brand-name">LabDesk 2.0</span>
                <span className="brand-tag">SENATI · ETI</span>
              </div>
              <span className="brand-subtitle">Seguimiento de Incidencias de Cómputo</span>
            </div>
          </div>

          {/* Selector de Vista: Incidencias vs Dashboard */}
          <div className="apple-view-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={vistaActiva === 'listado'}
              className={`view-nav-tab ${vistaActiva === 'listado' ? 'active' : ''}`}
              onClick={() => setVistaActiva('listado')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span>Incidencias</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vistaActiva === 'dashboard'}
              className={`view-nav-tab ${vistaActiva === 'dashboard' ? 'active' : ''}`}
              onClick={() => setVistaActiva('dashboard')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9"/>
                <rect x="14" y="3" width="7" height="5"/>
                <rect x="14" y="12" width="7" height="9"/>
                <rect x="3" y="16" width="7" height="5"/>
              </svg>
              <span>Dashboard ({metricas.porcentajeResolucion}%)</span>
            </button>
          </div>

          <div className="navbar-actions">
            <div className="status-pill" title="Django REST Framework y SQLite conectados">
              <span className="status-pulse-dot" />
              <span className="status-pill-text">API Conectada</span>
            </div>

            <button
              type="button"
              className="apple-button secondary export-btn"
              onClick={exportarCSV}
              title="Descargar reporte completo en CSV"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Exportar</span>
            </button>

            <button
              type="button"
              className="apple-button primary"
              onClick={abrirNuevaIncidencia}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nueva Incidencia</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Contenedor Principal */}
      <main className="apple-main">
        {/* Banner de error de conexión */}
        {error && (
          <div className="apple-alert-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button type="button" className="retry-btn" onClick={cargar}>Reintentar conexión</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 1: LISTADO DE INCIDENCIAS CON ALERTAS Y GESTIÓN */}
        {/* ============================================================== */}
        {vistaActiva === 'listado' && (
          <>
            {/* Tarjetas KPI Superiores */}
            <section className="apple-kpis-grid" aria-label="Resumen de métricas">
              <div
                className="apple-kpi-card total"
                style={{ cursor: 'pointer' }}
                onClick={() => setFiltroEstado('todos')}
                title="Ver todas"
              >
                <div className="kpi-header">
                  <span className="kpi-label">Total</span>
                  <span className="kpi-icon total-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </span>
                </div>
                <span className="kpi-value">{metricas.total}</span>
                <span className="kpi-footer">En base de datos SQLite</span>
              </div>

              <div
                className="apple-kpi-card pendientes"
                style={{ cursor: 'pointer' }}
                onClick={() => setFiltroEstado('pendiente')}
                title="Filtrar pendientes"
              >
                <div className="kpi-header">
                  <span className="kpi-label">Pendientes</span>
                  <span className="kpi-badge-dot dot-yellow" />
                </div>
                <span className="kpi-value">{metricas.pendientes}</span>
                <span className="kpi-footer">En espera de atención</span>
              </div>

              <div
                className="apple-kpi-card proceso"
                style={{ cursor: 'pointer' }}
                onClick={() => setFiltroEstado('en_proceso')}
                title="Filtrar en proceso"
              >
                <div className="kpi-header">
                  <span className="kpi-label">En Proceso</span>
                  <span className="kpi-badge-dot dot-orange" />
                </div>
                <span className="kpi-value">{metricas.enProceso}</span>
                <span className="kpi-footer">Con técnico asignado</span>
              </div>

              <div
                className="apple-kpi-card resueltos"
                style={{ cursor: 'pointer' }}
                onClick={() => setFiltroEstado('resuelto')}
                title="Filtrar resueltas"
              >
                <div className="kpi-header">
                  <span className="kpi-label">Resueltos</span>
                  <span className="kpi-badge-dot dot-green" />
                </div>
                <span className="kpi-value">{metricas.resueltos}</span>
                <span className="kpi-footer">Tasa: {metricas.porcentajeResolucion}%</span>
              </div>

              {/* Tarjeta de Alerta: Vencidas */}
              <div
                className="apple-kpi-card urgentes"
                style={{ cursor: 'pointer', border: metricas.vencidas > 0 ? '1px solid rgba(220, 38, 38, 0.35)' : '' }}
                onClick={() => setFiltroEstado('vencidas')}
                title="Filtrar incidencias vencidas"
              >
                <div className="kpi-header">
                  <span className="kpi-label" style={{ color: metricas.vencidas > 0 ? '#dc2626' : undefined }}>
                    Vencidas
                  </span>
                  <span className="kpi-badge-dot dot-red" />
                </div>
                <span className="kpi-value" style={{ color: metricas.vencidas > 0 ? '#dc2626' : undefined }}>
                  {metricas.vencidas}
                </span>
                <span className="kpi-footer">
                  {metricas.proximas > 0 ? `${metricas.proximas} por vencer (<24h)` : 'Sin retrasos críticos'}
                </span>
              </div>
            </section>

            {/* Barra de Controles: Segmented Control + Búsqueda + Filtros */}
            <section className="apple-toolbar">
              {/* Segmented Control iOS con pestañas de alertas */}
              <div className="segmented-control" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'todos'}
                  className={`segmented-tab ${filtroEstado === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('todos')}
                >
                  Todos <span className="tab-count">{metricas.total}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'pendiente'}
                  className={`segmented-tab ${filtroEstado === 'pendiente' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('pendiente')}
                >
                  Pendientes <span className="tab-count">{metricas.pendientes}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'en_proceso'}
                  className={`segmented-tab ${filtroEstado === 'en_proceso' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('en_proceso')}
                >
                  En Proceso <span className="tab-count">{metricas.enProceso}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'resuelto'}
                  className={`segmented-tab ${filtroEstado === 'resuelto' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('resuelto')}
                >
                  Resueltos <span className="tab-count">{metricas.resueltos}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'vencidas'}
                  className={`segmented-tab ${filtroEstado === 'vencidas' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('vencidas')}
                  style={{ color: metricas.vencidas > 0 ? '#dc2626' : undefined }}
                >
                  ⚠️ Vencidas <span className="tab-count" style={{ background: metricas.vencidas > 0 ? '#fee2e2' : undefined, color: metricas.vencidas > 0 ? '#dc2626' : undefined }}>{metricas.vencidas}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filtroEstado === 'proximas'}
                  className={`segmented-tab ${filtroEstado === 'proximas' ? 'active' : ''}`}
                  onClick={() => setFiltroEstado('proximas')}
                  style={{ color: metricas.proximas > 0 ? '#d97706' : undefined }}
                >
                  ⏰ Por vencer <span className="tab-count" style={{ background: metricas.proximas > 0 ? '#fef3c7' : undefined, color: metricas.proximas > 0 ? '#d97706' : undefined }}>{metricas.proximas}</span>
                </button>
              </div>

              {/* Fila de Búsqueda y Filtros de Categoría / Prioridad / Orden */}
              <div className="filters-row">
                <div className="search-input-wrapper">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="search"
                    className="apple-input search-field"
                    placeholder="Buscar por título, responsable, aula o falla..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setBusqueda('')}
                      aria-label="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="filter-selects">
                  <div className="select-wrapper">
                    <select
                      aria-label="Filtrar por categoría"
                      className="apple-select"
                      value={filtroCategoria}
                      onChange={e => setFiltroCategoria(e.target.value)}
                    >
                      <option value="todas">Todas las categorías</option>
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="red">Red / Internet</option>
                    </select>
                  </div>

                  <div className="select-wrapper">
                    <select
                      aria-label="Filtrar por prioridad"
                      className="apple-select"
                      value={filtroPrioridad}
                      onChange={e => setFiltroPrioridad(e.target.value)}
                    >
                      <option value="todas">Todas las prioridades</option>
                      <option value="alta">Prioridad Alta</option>
                      <option value="media">Prioridad Media</option>
                      <option value="baja">Prioridad Baja</option>
                    </select>
                  </div>

                  <div className="select-wrapper">
                    <select
                      aria-label="Ordenar listado"
                      className="apple-select sort-select"
                      value={orden}
                      onChange={e => setOrden(e.target.value)}
                    >
                      <option value="recientes">Más recientes</option>
                      <option value="antiguos">Más antiguos</option>
                      <option value="prioridad">Mayor prioridad</option>
                      <option value="fecha_limite">Próxima fecha límite</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Cabecera del listado */}
            <div className="list-status-header">
              <div className="list-title-wrap">
                <h2 className="list-section-title">Listado de Incidencias</h2>
                <span className="results-badge">
                  {incidenciasFiltradas.length} de {metricas.total} registros
                </span>
              </div>

              <button
                type="button"
                className="refresh-btn"
                onClick={cargar}
                disabled={cargando}
                title="Recargar desde la base de datos"
              >
                <svg className={cargando ? 'spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <span>{cargando ? 'Sincronizando...' : 'Actualizar'}</span>
              </button>
            </div>

            {/* Grilla de Tarjetas de Incidencia */}
            <section className="incidents-container">
              {incidenciasFiltradas.length === 0 ? (
                <div className="apple-empty-state">
                  <div className="empty-icon-circle">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <h3>No se encontraron incidencias</h3>
                  <p>Prueba cambiando los filtros seleccionados o registra una nueva incidencia.</p>
                  <button
                    type="button"
                    className="apple-button secondary"
                    onClick={() => {
                      setBusqueda('')
                      setFiltroEstado('todos')
                      setFiltroPrioridad('todas')
                      setFiltroCategoria('todas')
                    }}
                  >
                    Restablecer filtros
                  </button>
                </div>
              ) : (
                <div className="incidents-grid">
                  {incidenciasFiltradas.map(item => {
                    const venc = obtenerEstadoVencimiento(item)
                    const totalComs = item.comentarios ? item.comentarios.length : (item.total_comentarios || 0)

                    return (
                      <article key={item.id} className={`apple-card incident-card estado-${item.estado}`}>
                        {/* Barra superior de Badges */}
                        <div className="card-top-bar">
                          <div className="card-badges">
                            {/* Alerta de Vencimiento Destacada */}
                            <span className={`pill-badge ${venc.badgeClass}`} title={venc.detalle || venc.texto}>
                              <span className="pill-dot" />
                              {venc.texto}
                            </span>

                            <span className={`pill-badge prioridad-${item.prioridad}`}>
                              <span className="pill-dot" />
                              {item.prioridad.toUpperCase()}
                            </span>

                            <span className={`pill-badge categoria-${item.categoria}`}>
                              <span>{item.categoria}</span>
                            </span>
                          </div>
                          <span className="incident-id">#{item.id}</span>
                        </div>

                        {/* Título y Descripción */}
                        <h3 className="incident-title" onClick={() => abrirDetalle(item)} style={{ cursor: 'pointer' }}>
                          {item.titulo}
                        </h3>
                        <p className="incident-desc">{item.descripcion}</p>

                        {/* Fila de Responsable, Ubicación y Fecha Límite */}
                        <div className="incident-info-row">
                          {item.responsable ? (
                            <span className="incident-info-item responsable" title="Responsable asignado">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              <span>{item.responsable}</span>
                            </span>
                          ) : (
                            <span className="incident-info-item" style={{ color: '#9ca3af' }}>
                              <span>Sin asignar</span>
                            </span>
                          )}

                          <span className="incident-info-item ubicacion" title="Ubicación">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span>{item.ubicacion || item.aula || 'Lab 302'}</span>
                          </span>

                          {item.fecha_limite && (
                            <span className={`incident-info-item fecha-limite ${venc.badgeClass}`} title="Fecha límite">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                              <span>{formatearFecha(item.fecha_limite)}</span>
                            </span>
                          )}
                        </div>

                        {/* Meta footer con fecha de reporte y selector de estado rápido */}
                        <div className="incident-meta-footer">
                          <span className="meta-fecha" title="Fecha de creación">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {formatearFecha(item.creado_en)}
                          </span>

                          <div className="estado-select-wrapper">
                            <select
                              aria-label={`Actualizar estado de ${item.titulo}`}
                              className={`estado-dropdown ${item.estado}`}
                              value={item.estado}
                              onChange={e => actualizarEstado(item.id, e.target.value)}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="en_proceso">En proceso</option>
                              <option value="resuelto">Resuelto</option>
                            </select>
                          </div>
                        </div>

                        <div className="card-actions-divider" />

                        {/* Fila de Acciones: Detalle con Comentarios, Editar, Eliminar */}
                        <div className="card-actions-row">
                          <button
                            type="button"
                            className="card-action-btn detail"
                            onClick={() => abrirDetalle(item)}
                            title="Ver detalles e historial de comentarios"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>Comentarios ({totalComs})</span>
                          </button>

                          <button
                            type="button"
                            className="card-action-btn edit"
                            onClick={() => iniciarEdicion(item)}
                            title="Editar información"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            className="card-action-btn delete"
                            onClick={() => eliminar(item.id, item.titulo)}
                            title="Eliminar incidencia"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: DASHBOARD INTERACTIVO CON INDICADORES REALES */}
        {/* ============================================================== */}
        {vistaActiva === 'dashboard' && (
          <div className="dashboard-container">
            {/* Tarjeta Hero: Porcentaje de Resolución */}
            <section className="dashboard-hero-card">
              <div className="ring-chart-container">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path
                    className="circle-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle-progress"
                    strokeDasharray={`${metricas.porcentajeResolucion}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.5" className="percentage-text">
                    {metricas.porcentajeResolucion}%
                  </text>
                  <text x="18" y="27" className="percentage-label">
                    Resueltas
                  </text>
                </svg>
              </div>

              <div className="hero-stats-content">
                <div>
                  <h2 className="hero-stats-title">Efectividad de Atención en Laboratorios</h2>
                  <p className="hero-stats-desc">
                    Indicadores consolidados calculados directamente sobre la base de datos SQLite de Django.
                    Fórmula oficial: <code>(resueltas / total) × 100</code>.
                  </p>
                </div>

                <div className="hero-quick-metrics">
                  <div className="quick-metric-card resuelta-metric">
                    <span className="quick-metric-label">Resueltas</span>
                    <span className="quick-metric-value">{metricas.resueltos}</span>
                  </div>
                  <div className="quick-metric-card proxima-metric">
                    <span className="quick-metric-label">Próximas (&lt;24h)</span>
                    <span className="quick-metric-value">{metricas.proximas}</span>
                  </div>
                  <div className="quick-metric-card vencida-metric">
                    <span className="quick-metric-label">Vencidas</span>
                    <span className="quick-metric-value">{metricas.vencidas}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Desglose por Estado, Prioridad y Categoría */}
            <div className="dashboard-breakdown-grid">
              {/* Distribución por Estado */}
              <div className="breakdown-card">
                <div className="breakdown-header">
                  <h3 className="breakdown-title">Distribución por Estado</h3>
                  <span className="results-badge">{metricas.total} total</span>
                </div>

                <div className="breakdown-bars-list">
                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-yellow" /> Pendientes
                      </span>
                      <span className="bar-item-counts">
                        {metricas.pendientes} ({metricas.total > 0 ? Math.round((metricas.pendientes / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-yellow"
                        style={{ width: `${metricas.total > 0 ? (metricas.pendientes / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-orange" /> En Proceso
                      </span>
                      <span className="bar-item-counts">
                        {metricas.enProceso} ({metricas.total > 0 ? Math.round((metricas.enProceso / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-orange"
                        style={{ width: `${metricas.total > 0 ? (metricas.enProceso / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-green" /> Resueltos
                      </span>
                      <span className="bar-item-counts">
                        {metricas.resueltos} ({metricas.total > 0 ? Math.round((metricas.resueltos / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-green"
                        style={{ width: `${metricas.total > 0 ? (metricas.resueltos / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribución por Prioridad */}
              <div className="breakdown-card">
                <div className="breakdown-header">
                  <h3 className="breakdown-title">Distribución por Prioridad</h3>
                  <span className="results-badge">{metricas.total} total</span>
                </div>

                <div className="breakdown-bars-list">
                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-red" /> Alta (Urgente)
                      </span>
                      <span className="bar-item-counts">
                        {metricas.prioridades.alta} ({metricas.total > 0 ? Math.round((metricas.prioridades.alta / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-red"
                        style={{ width: `${metricas.total > 0 ? (metricas.prioridades.alta / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-orange" /> Media
                      </span>
                      <span className="bar-item-counts">
                        {metricas.prioridades.media} ({metricas.total > 0 ? Math.round((metricas.prioridades.media / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-orange"
                        style={{ width: `${metricas.total > 0 ? (metricas.prioridades.media / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">
                        <span className="pill-dot dot-green" /> Baja
                      </span>
                      <span className="bar-item-counts">
                        {metricas.prioridades.baja} ({metricas.total > 0 ? Math.round((metricas.prioridades.baja / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-green"
                        style={{ width: `${metricas.total > 0 ? (metricas.prioridades.baja / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribución por Categoría */}
              <div className="breakdown-card">
                <div className="breakdown-header">
                  <h3 className="breakdown-title">Distribución por Categoría</h3>
                  <span className="results-badge">Área técnica</span>
                </div>

                <div className="breakdown-bars-list">
                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">💻 Hardware</span>
                      <span className="bar-item-counts">
                        {metricas.categorias.hardware} ({metricas.total > 0 ? Math.round((metricas.categorias.hardware / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-blue"
                        style={{ width: `${metricas.total > 0 ? (metricas.categorias.hardware / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">⚙️ Software</span>
                      <span className="bar-item-counts">
                        {metricas.categorias.software} ({metricas.total > 0 ? Math.round((metricas.categorias.software / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-purple"
                        style={{ width: `${metricas.total > 0 ? (metricas.categorias.software / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="breakdown-bar-item">
                    <div className="bar-item-info">
                      <span className="bar-item-name">🌐 Red / Conectividad</span>
                      <span className="bar-item-counts">
                        {metricas.categorias.red} ({metricas.total > 0 ? Math.round((metricas.categorias.red / metricas.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill fill-green"
                        style={{ width: `${metricas.total > 0 ? (metricas.categorias.red / metricas.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceso Rápido y Alertas de Plazo */}
              <div className="breakdown-card">
                <div className="breakdown-header">
                  <h3 className="breakdown-title">Gestión de Plazos de SLA</h3>
                  <span className="results-badge">Atención oportuna</span>
                </div>

                <div className="detail-summary-card" style={{ padding: '14px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--apple-text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
                    Control de compromisos de atención según los criterios de vencimiento:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      className="apple-button secondary"
                      style={{ justifyContent: 'space-between', color: metricas.vencidas > 0 ? '#dc2626' : undefined }}
                      onClick={() => {
                        setFiltroEstado('vencidas')
                        setVistaActiva('listado')
                      }}
                    >
                      <span>Ver {metricas.vencidas} incidencias vencidas</span>
                      <span>→</span>
                    </button>

                    <button
                      type="button"
                      className="apple-button secondary"
                      style={{ justifyContent: 'space-between', color: metricas.proximas > 0 ? '#d97706' : undefined }}
                      onClick={() => {
                        setFiltroEstado('proximas')
                        setVistaActiva('listado')
                      }}
                    >
                      <span>Ver {metricas.proximas} por vencer en &lt;24h</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: FORMULARIO CREAR / EDITAR INCIDENCIA */}
      {/* ============================================================== */}
      {mostrarModal && (
        <div
          className="apple-modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget && !guardando) setMostrarModal(false)
          }}
        >
          <div className="apple-modal-window" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-header-titles">
                <span className="modal-eyebrow">
                  {editando === null ? 'SOPORTE TÉCNICO · SENATI' : `INCIDENCIA #${editando}`}
                </span>
                <h2 className="modal-title">
                  {editando === null ? 'Nueva Incidencia de Laboratorio' : 'Editar Incidencia'}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setMostrarModal(false)}
                disabled={guardando}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardar} className="apple-modal-form">
              {/* Título */}
              <div className="form-group">
                <label htmlFor="form-titulo">
                  Título de la incidencia <span className="req">*</span>
                </label>
                <input
                  id="form-titulo"
                  name="titulo"
                  maxLength="120"
                  className="apple-input"
                  style={{ borderColor: erroresValidacion.titulo ? '#dc2626' : undefined }}
                  placeholder="Ej: PC 08 no enciende, switch sin enlace, proyector apagado..."
                  value={form.titulo}
                  onChange={manejarCambio}
                />
                {erroresValidacion.titulo && (
                  <span style={{ fontSize: '11px', color: '#dc2626' }}>{erroresValidacion.titulo}</span>
                )}
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label htmlFor="form-descripcion">
                  Descripción detallada del problema <span className="req">*</span>
                </label>
                <textarea
                  id="form-descripcion"
                  rows="3"
                  name="descripcion"
                  className="apple-textarea"
                  style={{ borderColor: erroresValidacion.descripcion ? '#dc2626' : undefined }}
                  placeholder="Detalla la falla encontrada, equipo afectado o pruebas realizadas..."
                  value={form.descripcion}
                  onChange={manejarCambio}
                />
                {erroresValidacion.descripcion && (
                  <span style={{ fontSize: '11px', color: '#dc2626' }}>{erroresValidacion.descripcion}</span>
                )}
              </div>

              {/* Trío: Categoría, Prioridad, Estado */}
              <div className="form-row-three">
                <div className="form-group">
                  <label htmlFor="form-categoria">Categoría</label>
                  <select
                    id="form-categoria"
                    name="categoria"
                    className="apple-select"
                    value={form.categoria}
                    onChange={manejarCambio}
                  >
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="red">Red / Internet</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="form-prioridad">Prioridad</label>
                  <select
                    id="form-prioridad"
                    name="prioridad"
                    className="apple-select"
                    value={form.prioridad}
                    onChange={manejarCambio}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="form-estado">Estado</label>
                  <select
                    id="form-estado"
                    name="estado"
                    className="apple-select"
                    value={form.estado}
                    onChange={manejarCambio}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              {/* Campos Obligatorios LabDesk 2.0: Responsable, Ubicación, Fecha Límite */}
              <div className="form-row-three">
                <div className="form-group">
                  <label htmlFor="form-responsable">Responsable Asignado</label>
                  <input
                    id="form-responsable"
                    name="responsable"
                    className="apple-input"
                    placeholder="Ej: Ing. Carlos Mendoza"
                    value={form.responsable}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-ubicacion">Ubicación / Ambiente</label>
                  <input
                    id="form-ubicacion"
                    name="ubicacion"
                    className="apple-input"
                    placeholder="Ej: Lab 302 - Estación 08"
                    value={form.ubicacion}
                    onChange={manejarCambio}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-fecha-limite">Fecha y Hora Límite</label>
                  <input
                    id="form-fecha-limite"
                    type="datetime-local"
                    name="fecha_limite"
                    className="apple-input"
                    value={form.fecha_limite}
                    onChange={manejarCambio}
                  />
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="apple-button secondary"
                  onClick={() => setMostrarModal(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button type="submit" className="apple-button primary" disabled={guardando}>
                  {guardando ? 'Guardando en SQLite...' : editando === null ? 'Registrar Incidencia' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VISTA DE DETALLE E HISTORIAL DE COMENTARIOS */}
      {/* ============================================================== */}
      {incidenciaDetalle && (
        <div
          className="apple-modal-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) setIncidenciaDetalle(null)
          }}
        >
          <div className="apple-modal-window detail-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-header-titles">
                <span className="modal-eyebrow">
                  DETALLE DE INCIDENCIA #{incidenciaDetalle.id}
                </span>
                <h2 className="modal-title">{incidenciaDetalle.titulo}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIncidenciaDetalle(null)}
                aria-label="Cerrar detalle"
              >
                ✕
              </button>
            </div>

            <div className="detail-modal-body">
              {/* Tarjeta de Resumen con Alerta de Vencimiento */}
              <div className="detail-summary-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="card-badges">
                    {(() => {
                      const v = obtenerEstadoVencimiento(incidenciaDetalle)
                      return (
                        <span className={`pill-badge ${v.badgeClass}`}>
                          <span className="pill-dot" />
                          {v.texto} {v.detalle ? `(${v.detalle})` : ''}
                        </span>
                      )
                    })()}

                    <span className={`pill-badge prioridad-${incidenciaDetalle.prioridad}`}>
                      <span className="pill-dot" />
                      {incidenciaDetalle.prioridad.toUpperCase()}
                    </span>

                    <span className={`pill-badge categoria-${incidenciaDetalle.categoria}`}>
                      <span>{incidenciaDetalle.categoria}</span>
                    </span>
                  </div>

                  {/* Selector directo de estado en el detalle */}
                  <div className="estado-select-wrapper">
                    <select
                      aria-label="Cambiar estado"
                      className={`estado-dropdown ${incidenciaDetalle.estado}`}
                      value={incidenciaDetalle.estado}
                      onChange={e => actualizarEstado(incidenciaDetalle.id, e.target.value)}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>
                </div>

                {/* Grid con Responsable, Ubicación, Fecha Límite, Fecha Creación */}
                <div className="detail-summary-grid">
                  <div className="detail-grid-item">
                    <span className="detail-grid-label">Responsable</span>
                    <span className="detail-grid-value">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {incidenciaDetalle.responsable || 'No asignado'}
                    </span>
                  </div>

                  <div className="detail-grid-item">
                    <span className="detail-grid-label">Ubicación</span>
                    <span className="detail-grid-value">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {incidenciaDetalle.ubicacion || incidenciaDetalle.aula || 'Lab 302'}
                    </span>
                  </div>

                  <div className="detail-grid-item">
                    <span className="detail-grid-label">Fecha Límite</span>
                    <span className="detail-grid-value">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {formatearFecha(incidenciaDetalle.fecha_limite)}
                    </span>
                  </div>

                  <div className="detail-grid-item">
                    <span className="detail-grid-label">Registrado el</span>
                    <span className="detail-grid-value">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatearFecha(incidenciaDetalle.creado_en)}
                    </span>
                  </div>
                </div>

                <div className="detail-description-box">
                  {incidenciaDetalle.descripcion}
                </div>
              </div>

              {/* SECCIÓN OBLIGATORIA: HISTORIAL DE COMENTARIOS */}
              <div className="comments-section-header">
                <h3 className="comments-section-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>Historial de Comentarios ({incidenciaDetalle.comentarios ? incidenciaDetalle.comentarios.length : 0})</span>
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--apple-text-tertiary)' }}>
                  Orden cronológico
                </span>
              </div>

              {/* Timeline de Comentarios */}
              <div className="comments-timeline">
                {!incidenciaDetalle.comentarios || incidenciaDetalle.comentarios.length === 0 ? (
                  <div className="empty-comments">
                    Aún no hay comentarios ni actualizaciones registradas para esta incidencia.
                  </div>
                ) : (
                  incidenciaDetalle.comentarios.map((c, index) => {
                    const inicial = (c.autor || 'S').trim().charAt(0).toUpperCase()
                    return (
                      <div key={c.id || index} className="comment-bubble">
                        <div className="comment-bubble-header">
                          <div className="comment-author-badge">
                            <span className="avatar-circle">{inicial}</span>
                            <span className="author-name">{c.autor}</span>
                          </div>
                          <span className="comment-time">
                            {c.creado_en_formato || formatearFecha(c.creado_en)}
                          </span>
                        </div>
                        <div className="comment-text">{c.texto}</div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Formulario para Agregar Comentario */}
              <form onSubmit={registrarComentario} className="new-comment-form">
                <div className="comment-inputs-row">
                  <input
                    type="text"
                    required
                    maxLength="80"
                    placeholder="Tu nombre o cargo..."
                    className="apple-input"
                    value={nuevoComentario.autor}
                    onChange={e => setNuevoComentario(prev => ({ ...prev, autor: e.target.value }))}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Escribe una acción, novedad o avance técnico..."
                    className="apple-input"
                    value={nuevoComentario.texto}
                    onChange={e => setNuevoComentario(prev => ({ ...prev, texto: e.target.value }))}
                  />
                </div>
                <div className="comment-submit-row">
                  <button
                    type="submit"
                    className="apple-button primary"
                    disabled={enviandoComentario}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    <span>{enviandoComentario ? 'Guardando...' : 'Agregar Comentario'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pie de Página Institucional SENATI */}
      <footer className="apple-footer">
        <div className="footer-content">
          <p className="footer-credits">
            <strong>SENATI</strong> · Servicio Nacional de Adiestramiento en Trabajo Industrial · Escuela de Tecnologías de la Información
          </p>
          <p className="footer-details">
            LabDesk 2.0 · Django REST Framework (SQLite) + React 19 (Vite) · Semestre V · Desarrollo Full Stack
          </p>
        </div>
      </footer>
    </div>
  )
}
