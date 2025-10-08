import React, { useEffect, useState, useMemo } from 'react'
import api from '../api'
import '../styles.css'

// Definición de verificaciones según tipo de cabezal y tipo de mantenimiento
const VERIFICATION_CONFIG = {
  'H2': {
    'Mensual': [
      'Limpieza de flecha y reemplazo de pines de clampeo',
      'Limpieza de filtros del cabezal'
    ],
    'Año y Medio': [
      'Lubricación de partes movibles'
    ]
  },
  'H8': {
    'Semanal': [
      'Limpieza de la sección de reconocimiento (IPS)',
      'Limpieza de LEDs',
      'Limpieza de cristales prismas',
      'Limpieza de reflectores'
    ],
    'Quincenal': [
      'Lubricación de borde de la flecha'
    ],
    'Mensual': [
      'Limpieza y lubricación de flecha',
      'Lubricación de piezas móviles',
      'Lubricación de O-ring en syringes'
    ],
    'Semestral': [
      'Lubricación del brazo de eje rotatorio'
    ],
    'Año y Medio': [
      'Lubricación de partes móviles',
      'Reemplazo de O-rings en válvulas mecánicas'
    ]
  },
  'H24': {
    'Semanal': [
      'Limpieza de cámaras IPS',
      'Limpieza de LEDs'
    ],
    'Mensual': [
      'Limpieza / Reemplazo de filtros',
      'Lavado de cabezales en auto head cleaner',
      'Lubricación de flechas y O-rings',
      'Rellenado de grasa Jig ZAGTHJ0052XX'
    ],
    'Semestral': [
      'Lubricación del eje de rotación del brazo',
      'Lubricación de piezas movibles',
      'Lubricación de válvula O-ring mecánica'
    ],
    'Año y Medio': [
      'Lubricación de partes móviles',
      'Reemplazar válvula mecánica de los O-rings'
    ]
  }
}

const TIPO_OPTIONS = ['H2', 'H8', 'H24']

// Helper function to get local date in YYYY-MM-DD format
function getTodayLocal() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const day = d.getDate()
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const month = monthNames[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function ProgressBar({ startDate, dueDate }) {
  const now = new Date()
  
  let fc, fv
  
  try {
    fc = startDate ? new Date(startDate) : null
    fv = dueDate ? new Date(dueDate) : null
    
    if (!fc || !fv || isNaN(fc.getTime()) || isNaN(fv.getTime())) {
      throw new Error('Invalid dates')
    }
    
    if (fv <= fc) {
      throw new Error('Due date before start date')
    }
    
  } catch (error) {
    return (
      <div className="progress">
        <div className="progress-bar" style={{ width: '0%', background: '#64748b' }} />
        <div className="progress-label">N/A</div>
      </div>
    )
  }

  const total = fv.getTime() - fc.getTime()
  const elapsed = now.getTime() - fc.getTime()
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))

  let color = '#22c55e' // green
  if (pct >= 90) color = '#dc2626' // red
  else if (pct >= 75) color = '#f59e0b' // orange
  else if (pct >= 60) color = '#eab308' // yellow

  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
      <div className="progress-label">{pct}%</div>
    </div>
  )
}

// Función para obtener las opciones de tipo_mantenimiento según el tipo de cabezal
function getTipoMantenimientoOptions(tipo) {
  if (!tipo) return []
  
  const options = {
    'H2': ['Mensual', 'Año y Medio'],
    'H8': ['Semanal', 'Quincenal', 'Mensual', 'Semestral', 'Año y Medio'],
    'H24': ['Semanal', 'Mensual', 'Semestral', 'Año y Medio']
  }
  
  return options[tipo] || []
}

// Función para obtener las verificaciones según tipo de cabezal y tipo de mantenimiento
function getVerifications(tipo, tipoMantenimiento) {
  if (!tipo || !tipoMantenimiento) return []
  return VERIFICATION_CONFIG[tipo]?.[tipoMantenimiento] || []
}

// Función para calcular la fecha del próximo mantenimiento según el tipo
function calculateNextMaintenance(tipoMantenimiento, fechaBase) {
  const fecha = new Date(fechaBase)
  
  switch(tipoMantenimiento) {
    case 'Semanal':
      fecha.setDate(fecha.getDate() + 7) // +1 semana
      break
    case 'Quincenal':
      fecha.setDate(fecha.getDate() + 15) // +15 días
      break
    case 'Mensual':
      fecha.setMonth(fecha.getMonth() + 1) // +1 mes
      break
    case 'Semestral':
      fecha.setMonth(fecha.getMonth() + 6) // +6 meses
      break
    case 'Año y Medio':
      fecha.setMonth(fecha.getMonth() + 18) // +18 meses
      break
    default:
      fecha.setMonth(fecha.getMonth() + 1) // Default: +1 mes
  }
  
  return fecha.toISOString().split('T')[0]
}

// Opciones de línea
const LINEA_OPTIONS = ['1', '2', '3', '4', 'Tool Room']

export default function Cabezales() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ numero: '', tipo: 'H2', linea: '1', tipo_mantenimiento: 'Mensual', ubicacion: 'Linea', estado: 'Operando', fm: '', sm: '', ops: {}, observaciones: '' })
  const [detailItem, setDetailItem] = useState(null)
  const [errors, setErrors] = useState({})
  const [scannerStatus, setScannerStatus] = useState('')
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({ ops: {}, observaciones: '', fecha_mantenimiento: '', fecha_proximo: '', tipo_mantenimiento: '' })
  const [showBajaForm, setShowBajaForm] = useState(false)
  const [bajaForm, setBajaForm] = useState({ motivo: '' })
  const [currentSection, setCurrentSection] = useState('todos')
  const [currentTipo, setCurrentTipo] = useState('todos') // Filtro por tipo H2, H8, H24
  const [showMessage, setShowMessage] = useState(null)
  const [showReactivarForm, setShowReactivarForm] = useState(false)
  const [reactivarForm, setReactivarForm] = useState({ ops: {}, observaciones: '', fecha_reactivacion: '', tipo_mantenimiento: '' })

  useEffect(() => { fetchData() }, [])
  
  // Auto-detect barcode scanner input
  useEffect(() => {
    let scannerTimeout = null
    let buffer = ''
    
    function handleKeyPress(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.key && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        buffer += e.key
        
        if (scannerTimeout) clearTimeout(scannerTimeout)
        
        scannerTimeout = setTimeout(() => {
          if (buffer.length >= 2) {
            processScannerInput(buffer)
          }
          buffer = ''
        }, 300)
      }
    }
    
    function handleKeyDown(e) {
      if (e.key === 'Enter' && buffer.length >= 2 && 
          e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (scannerTimeout) clearTimeout(scannerTimeout)
        processScannerInput(buffer)
        buffer = ''
      }
    }
    
    document.addEventListener('keypress', handleKeyPress)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keypress', handleKeyPress)
      document.removeEventListener('keydown', handleKeyDown)
      if (scannerTimeout) clearTimeout(scannerTimeout)
    }
  }, [items])

  function processScannerInput(scannedValue) {
    setScannerStatus(`Escaneado: ${scannedValue}`)
    
    const found = items.find(item => {
      const itemNumber = String(item.numero)
      const scannedString = String(scannedValue).trim()
      
      const exactMatch = itemNumber === scannedString
      const withoutLeadingZeros = parseInt(itemNumber, 10) === parseInt(scannedString, 10)
      const containsMatch = itemNumber.includes(scannedString)
      const lineaMatch = item.linea?.toLowerCase().includes(scannedString.toLowerCase())
      
      return exactMatch || withoutLeadingZeros || containsMatch || lineaMatch
    })
    
    if (found) {
      setScannerStatus(`Encontrado: Cabezal ${found.numero}`)
      openDetail(found)
    } else {
      setScannerStatus(`Creando nuevo: ${scannedValue}`)
      openNewWithNumber(scannedValue)
    }
    
    setTimeout(() => setScannerStatus(''), 3000)
  }

  async function fetchData() {
    try {
      const res = await api.get('/cabezales')
      const data = res.data || []
      // Agrupar por numero: cada item tendrá .entries = array de registros (uno por tipo_mantenimiento)
      const groupedByNumero = {}
      data.forEach(item => {
        const n = item.numero
        if (!groupedByNumero[n]) groupedByNumero[n] = { numero: n, entries: [] }
        groupedByNumero[n].entries.push(item)
        // track primary (most recent id)
        if (!groupedByNumero[n].primary || groupedByNumero[n].primary.id < item.id) {
          groupedByNumero[n].primary = item
        }
      })

      const uniqueItems = Object.values(groupedByNumero)
      setItems(uniqueItems)
    } catch (err) {
      console.error(err)
      setItems([])
    }
  }

  function openNew() {
    setEditing(null)
    const today = getTodayLocal()
    const tipoMant = 'Mensual'
    const nextMaintenance = calculateNextMaintenance(tipoMant, today)
    
    setForm({ 
      numero: '', 
      tipo: 'H2', 
      linea: '1', 
      tipo_mantenimiento: tipoMant,
      ubicacion: 'Linea',
      estado: 'Operando',
      fm: today, 
      sm: nextMaintenance, 
      ops: {}, 
      observaciones: '' 
    })
    setShowForm(true)
  }

  function openNewWithNumber(numero) {
    setEditing(null)
    const today = getTodayLocal()
    const tipoMant = 'Mensual'
    const nextMaintenance = calculateNextMaintenance(tipoMant, today)
    
    setForm({ 
      numero: String(numero).trim(),
      tipo: 'H2',
      linea: '1',
      tipo_mantenimiento: tipoMant,
      ubicacion: 'Linea',
      estado: 'Operando',
      fm: today,
      sm: nextMaintenance,
      ops: {},
      observaciones: ''
    })
    setShowForm(true)
    setDetailItem(null)
  }

  // Categorizar items
  const categorizedItems = useMemo(() => {
    const enLinea = items.filter(item => item.ubicacion === 'Linea' && item.estado === 'Operando' && item.sm && item.categoria !== 'vencido')
    const toolRoom = items.filter(item => item.ubicacion === 'Tool Room')
    const enReparacion = items.filter(item => item.estado === 'Por reparar')
    const dadosDeBaja = items.filter(item => item.estado === 'Baja')
    const proximosVencer = items.filter(item => item.ubicacion === 'Linea' && item.estado === 'Operando' && item.sm && (item.categoria === 'proximo_vencer' || item.categoria === 'vencido'))
    
    return { enLinea, toolRoom, enReparacion, dadosDeBaja, proximosVencer }
  }, [items])

  function openMaintenanceForm(item) {
    const today = getTodayLocal()
    const tipoMant = item.tipo_mantenimiento || 'Mensual'
    const nextMaintenance = calculateNextMaintenance(tipoMant, today)
    
    setMaintenanceForm({ 
      ops: {}, 
      observaciones: '', 
      fecha_mantenimiento: today,
      fecha_proximo: nextMaintenance,
      tipo_mantenimiento: tipoMant,
      estado: item.estado || 'Operando',
      ubicacion: item.ubicacion || 'Linea'
    })
    setShowMaintenanceForm(item)
    setDetailItem(null)
  }

  async function saveMantenimiento() {
    if (!showMaintenanceForm) return
    
    try {
      // send estado and ubicacion in maintenance payload so backend can update location/state
      const payload = { ...maintenanceForm }
      await api.post(`/cabezales/${showMaintenanceForm.id}/mantenimiento`, payload)
      await fetchData()
      setShowMaintenanceForm(false)
  setMaintenanceForm({ ops: {}, observaciones: '', fecha_mantenimiento: '', fecha_proximo: '', tipo_mantenimiento: '', estado: 'Operando', ubicacion: 'Linea' })
      showCustomMessage('success', 'Mantenimiento registrado exitosamente')
    } catch (err) {
      console.error('Error al registrar mantenimiento:', err)
      showCustomMessage('error', 'Error al registrar mantenimiento: ' + (err.response?.data?.error || err.message))
    }
  }

  function openBajaForm(item) {
    setBajaForm({ motivo: '' })
    setShowBajaForm(item)
    setDetailItem(null)
  }

  async function darDeBaja() {
    if (!showBajaForm || !bajaForm.motivo.trim()) {
      showCustomMessage('error', 'Debe ingresar un motivo para dar de baja')
      return
    }
    
    try {
      await api.post(`/cabezales/${showBajaForm.id}/baja`, bajaForm)
      await fetchData()
      setShowBajaForm(false)
      setBajaForm({ motivo: '' })
      showCustomMessage('success', 'Cabezal dado de baja exitosamente')
    } catch (err) {
      console.error('Error al dar de baja:', err)
      showCustomMessage('error', 'Error al dar de baja: ' + (err.response?.data?.error || err.message))
    }
  }

  function openReactivarForm(item) {
    const today = getTodayLocal()
    
    setReactivarForm({ 
      ops: {}, 
      observaciones: '', 
      fecha_reactivacion: today,
      tipo_mantenimiento: item.tipo_mantenimiento || 'Mensual'
    })
    setShowReactivarForm(item)
    setDetailItem(null)
  }

  async function saveReactivacion() {
    if (!showReactivarForm) return
    
    if (!reactivarForm.observaciones.trim()) {
      showCustomMessage('error', 'Las observaciones son obligatorias para la reactivación')
      return
    }
    
    try {
      await api.post(`/cabezales/${showReactivarForm.id}/reactivar`, reactivarForm)
      await fetchData()
      setShowReactivarForm(false)
      setReactivarForm({ ops: {}, observaciones: '', fecha_reactivacion: '', tipo_mantenimiento: '' })
      showCustomMessage('success', 'Cabezal reactivado exitosamente')
    } catch (err) {
      console.error('Error al reactivar:', err)
      showCustomMessage('error', 'Error al reactivar: ' + (err.response?.data?.error || err.message))
    }
  }

  function openEdit(item) {
    setEditing(item.id)
    const opsObj = {}
    for (let i = 0; i <= 11; i++) {
      const fieldName = i === 0 ? 'op' : `op${i}`
      opsObj[`op${i}`] = !!item[fieldName]
    }
    setForm({ 
      numero: String(item.numero), 
      tipo: item.tipo, 
      linea: item.linea || '', 
      tipo_mantenimiento: item.tipo_mantenimiento,
      fm: item.fm ? item.fm.split('T')[0] : '', 
      sm: item.sm ? item.sm.split('T')[0] : '', 
      ops: opsObj, 
      observaciones: item.observaciones || '' 
    })
    setShowForm(true)
    setDetailItem(null)
  }

  function openDetail(item) { 
    setDetailItem(item)
    setShowForm(false)
  }

  function toggleMaintenanceOp(key) {
    setMaintenanceForm(f => ({ ...f, ops: { ...f.ops, [key]: !f.ops[key] } }))
  }

  function toggleReactivarOp(key) {
    setReactivarForm(f => ({ ...f, ops: { ...f.ops, [key]: !f.ops[key] } }))
  }

  function handleNumeroChange(e) {
    const value = e.target.value
    setForm(f => ({ ...f, numero: value }))
    
    if (errors.numero) {
      setErrors(prev => ({ ...prev, numero: '' }))
    }
  }

  function showCustomMessage(type, message) {
    setShowMessage({ type, message })
    setTimeout(() => setShowMessage(null), 5000)
  }

  async function save() {
    const newErrors = {}
    if (!form.numero) newErrors.numero = 'Número requerido'
    if (!form.tipo) newErrors.tipo = 'Tipo requerido'
    if (!form.tipo_mantenimiento) newErrors.tipo_mantenimiento = 'Tipo de mantenimiento requerido'
    if (!form.fm) newErrors.fm = 'Fecha última requerida'
    if (!form.sm) newErrors.sm = 'Fecha próxima requerida'
    
    // Validar que observaciones sean obligatorias para estado "Por reparar" o "Baja"
    if ((form.estado === 'Por reparar' || form.estado === 'Baja') && !form.observaciones.trim()) {
      newErrors.observaciones = 'Las observaciones son obligatorias para estado "Por reparar" o "Baja"'
    }
    
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const payload = { ...form }
    try {
      if (editing) {
        await api.put(`/cabezales/${editing}`, payload)
        showCustomMessage('success', 'Cabezal actualizado exitosamente')
      } else {
        // Siempre crear nuevo registro (permitir mismo número con distintos mantenimientos)
        await api.post('/cabezales', payload)
        showCustomMessage('success', 'Cabezal / mantenimiento registrado exitosamente')
      }
      await fetchData()
      setShowForm(false)
      setEditing(null)
      setErrors({})
    } catch (err) {
      console.error('Save error', err)
      showCustomMessage('error', 'Error al guardar el cabezal: ' + (err.response?.data?.message || err.response?.data?.error || err.message))
    }
  }

  function toggleOp(key) {
    setForm(f => ({ ...f, ops: { ...f.ops, [key]: !f.ops[key] } }))
  }

  function cancelForm() { 
    setShowForm(false)
    setEditing(null)
    setErrors({})
  }

  // Manejar cambio de tipo de cabezal
  function handleTipoChange(newTipo) {
    const mantenimientoOptions = getTipoMantenimientoOptions(newTipo)
    const tipoMant = mantenimientoOptions[0] || ''
    const nextMaint = calculateNextMaintenance(tipoMant, form.fm || getTodayLocal())
    
    setForm(f => ({ 
      ...f, 
      tipo: newTipo, 
      tipo_mantenimiento: tipoMant,
      sm: nextMaint,
      ops: {} // Reset verificaciones
    }))
  }

  // Manejar cambio de tipo de mantenimiento
  function handleTipoMantenimientoChange(newTipoMant) {
    const nextMaint = calculateNextMaintenance(newTipoMant, form.fm || getTodayLocal())
    setForm(f => ({ 
      ...f, 
      tipo_mantenimiento: newTipoMant,
      sm: nextMaint,
      ops: {} // Reset verificaciones
    }))
  }

  // Manejar cambio de línea
  function handleLineaChange(newLinea) {
    const nuevaUbicacion = newLinea === 'Tool Room' ? 'Tool Room' : 'Linea'
    let nuevoEstado = form.estado
    
    if (newLinea === 'Tool Room') {
      // Si cambia a Tool Room y el estado es Operando, cambiar a Por reparar
      if (form.estado === 'Operando') {
        nuevoEstado = 'Por reparar'
      }
    } else {
      // Si cambia a Línea, siempre Operando
      nuevoEstado = 'Operando'
    }
    
    setForm(f => ({ 
      ...f, 
      linea: newLinea,
      ubicacion: nuevaUbicacion,
      estado: nuevoEstado
    }))
  }

  // Manejar cambio de fecha de mantenimiento
  function handleFechaMantenimientoChange(newFecha) {
    const nextMaint = calculateNextMaintenance(form.tipo_mantenimiento, newFecha)
    setForm(f => ({ 
      ...f, 
      fm: newFecha,
      sm: nextMaint
    }))
  }

  return (
    <div className="cabezales-root">
      <div className="app">
        <header className="header">
          <h1>Registro de Mantenimientos - Cabezales SMT</h1>
        </header>

        {/* Custom Message Component */}
        {showMessage && (
          <div className={`custom-message ${showMessage.type}`}>
            <div className="message-content">
              <span className="message-icon">
                {showMessage.type === 'error' ? '❌' : '✅'}
              </span>
              <span className="message-text">{showMessage.message}</span>
              <button className="message-close" onClick={() => setShowMessage(null)}>×</button>
            </div>
          </div>
        )}

        <div className="controls">
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" onClick={openNew}>
              Nuevo Cabezal
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {scannerStatus && (
              <div style={{ 
                padding: '6px 12px', 
                background: 'rgba(34,197,94,0.1)', 
                border: '1px solid #22c55e',
                borderRadius: '6px',
                color: '#22c55e',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {scannerStatus}
              </div>
            )}
            <div className="tag">{items.length} registros</div>
          </div>
        </div>

        {/* Secciones de navegación */}
        <div className="sections-nav">
          <button 
            className={`section-btn ${currentSection === 'todos' ? 'active' : ''}`}
            onClick={() => setCurrentSection('todos')}
          >
            Todos ({items.filter(item => item.estado !== 'Baja').length})
          </button>
          <button 
            className={`section-btn ${currentSection === 'en_linea' ? 'active' : ''}`}
            onClick={() => setCurrentSection('en_linea')}
          >
            En Línea ({categorizedItems.enLinea.length})
          </button>
          <button 
            className={`section-btn ${currentSection === 'tool_room' ? 'active' : ''}`}
            onClick={() => setCurrentSection('tool_room')}
          >
            Tool Room ({categorizedItems.toolRoom.length})
          </button>
          <button 
            className={`section-btn ${currentSection === 'reparacion' ? 'active' : ''}`}
            onClick={() => setCurrentSection('reparacion')}
          >
            Por reparar ({categorizedItems.enReparacion.length})
          </button>
          <button 
            className={`section-btn ${currentSection === 'proximo_vencer' ? 'active' : ''}`}
            onClick={() => setCurrentSection('proximo_vencer')}
          >
            Próximos a Vencer ({categorizedItems.proximosVencer.length})
          </button>
          <button 
            className={`section-btn ${currentSection === 'baja' ? 'active' : ''}`}
            onClick={() => setCurrentSection('baja')}
          >
            Dados de Baja ({categorizedItems.dadosDeBaja.length})
          </button>
        </div>

        {/* Filtro por tipo de cabezal */}
        <div className="sections" style={{ marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
          <button 
            className={`section-btn ${currentTipo === 'todos' ? 'active' : ''}`}
            onClick={() => setCurrentTipo('todos')}
          >
            Todos los Tipos
          </button>
          <button 
            className={`section-btn ${currentTipo === 'H2' ? 'active' : ''}`}
            onClick={() => setCurrentTipo('H2')}
          >
            H2
          </button>
          <button 
            className={`section-btn ${currentTipo === 'H8' ? 'active' : ''}`}
            onClick={() => setCurrentTipo('H8')}
          >
            H8
          </button>
          <button 
            className={`section-btn ${currentTipo === 'H24' ? 'active' : ''}`}
            onClick={() => setCurrentTipo('H24')}
          >
            H24
          </button>
        </div>

        {/* Modal para nuevo cabezal */}
        {showForm && (
          <div className="detail-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="maintenance-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editing ? 'Editar Cabezal' : 'Nuevo Cabezal'}</h3>
                <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="form-grid">
                  <label className="half">
                    <div className="muted">Número del cabezal</div>
                    <input 
                      className="input" 
                      placeholder="Número" 
                      value={form.numero} 
                      onChange={handleNumeroChange} 
                    />
                    {errors.numero && <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '4px' }}>{errors.numero}</div>}
                  </label>
                  
                  <label className="half">
                    <div className="muted">Tipo de Cabezal</div>
                    <select className="input select" value={form.tipo} onChange={e => handleTipoChange(e.target.value)}>
                      {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.tipo && <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '4px' }}>{errors.tipo}</div>}
                  </label>
                  
                  <label className="half">
                    <div className="muted">Línea</div>
                    <select className="input select" value={form.linea} onChange={e => handleLineaChange(e.target.value)}>
                      {LINEA_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                  
                  <label className="half">
                    <div className="muted">Estado</div>
                    {form.ubicacion === 'Tool Room' ? (
                      <select className="input select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                        <option value="Por reparar">Por reparar</option>
                        <option value="Baja">Baja</option>
                        <option value="Resguardo">Resguardo</option>
                      </select>
                    ) : (
                      <input className="input" value="Operando" disabled style={{ background: '#1e293b', color: '#94a3b8' }} />
                    )}
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {form.ubicacion === 'Linea' ? 'En línea siempre está "Operando"' : 'Seleccione el estado en Tool Room'}
                    </div>
                  </label>
                  
                  <label className="half">
                    <div className="muted">Tipo de Mantenimiento</div>
                    <select className="input select" value={form.tipo_mantenimiento} onChange={e => handleTipoMantenimientoChange(e.target.value)}>
                      {getTipoMantenimientoOptions(form.tipo).map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                    {errors.tipo_mantenimiento && <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '4px' }}>{errors.tipo_mantenimiento}</div>}
                  </label>

                  <label className="half">
                    <div className="muted">Fecha de verificación inicial</div>
                    <input className="input" type="date" value={form.fm} disabled style={{ background: '#1e293b', color: '#94a3b8' }} />
                    {errors.fm && <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '4px' }}>{errors.fm}</div>}
                  </label>

                  <label className="half">
                    <div className="muted">Próximo mantenimiento</div>
                    <input className="input" type="date" value={form.sm || ''} disabled style={{ background: '#1e293b', color: '#94a3b8' }} />
                  </label>

                  <div className="full">
                    <div style={{ marginBottom: 12, fontWeight: 600, color: '#cbd5e1' }}>
                      Puntos de verificación para {form.tipo} - {form.tipo_mantenimiento}:
                    </div>
                    <div className="checks">
                      {getVerifications(form.tipo, form.tipo_mantenimiento).map((label, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={!!form.ops[`op${idx}`]} onChange={() => toggleOp(`op${idx}`)} /> 
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="full">
                    <textarea 
                      className="input" 
                      placeholder={(form.estado === 'Por reparar' || form.estado === 'Baja') ? 'Observaciones (OBLIGATORIAS para "Por reparar" o "Baja")' : 'Observaciones iniciales'}
                      value={form.observaciones} 
                      onChange={e => setForm({ ...form, observaciones: e.target.value })} 
                      rows="4"
                      style={(form.estado === 'Por reparar' || form.estado === 'Baja') && !form.observaciones.trim() ? { borderColor: '#fb7185' } : {}}
                    />
                    {errors.observaciones && <div style={{ color: '#fb7185', fontSize: '12px', marginTop: '4px' }}>{errors.observaciones}</div>}
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn success" onClick={save}>{editing ? 'Actualizar' : 'Crear Cabezal'}</button>
                <button className="btn secondary" onClick={cancelForm}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Grid de tarjetas */}
        <div className="cards">
          {(() => {
            let displayItems = items
            if (currentSection === 'en_linea') displayItems = categorizedItems.enLinea
            else if (currentSection === 'reparacion') displayItems = categorizedItems.enReparacion
            else if (currentSection === 'proximo_vencer') displayItems = categorizedItems.proximosVencer
            else if (currentSection === 'baja') displayItems = categorizedItems.dadosDeBaja
            else if (currentSection === 'tool_room') displayItems = categorizedItems.toolRoom
            else if (currentSection === 'todos') displayItems = items.filter(item => item.estado !== 'Baja')

            // Aplicar filtro de tipo
            if (currentTipo !== 'todos') {
              displayItems = displayItems.filter(item => item.tipo === currentTipo)
            }

            if (displayItems.length === 0) {
              return (
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#6b7280' 
                }}>
                  No hay cabezales en esta sección
                </div>
              )
            }

            return displayItems.map(group => {
              const item = (group && group.primary) ? group.primary : group
              const entries = (group && Array.isArray(group.entries) && group.entries.length > 0) ? group.entries : [item]

              return (
                <div key={item.id || `group-${item.numero}`} onDoubleClick={() => openDetail(item)} className="card-container">
                  <div className={`card ${item?.categoria === 'vencido' ? 'card-vencido' : item?.categoria === 'proximo_vencer' ? 'card-proximo' : ''}`}>
                    {item?.categoria === 'vencido' && (
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        height: '4px',
                        background: 'linear-gradient(90deg, #dc2626, #b91c1c, #dc2626)',
                        zIndex: 10
                      }}></div>
                    )}
                    <div className="card-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item?.categoria === 'vencido' && (
                            <span style={{ 
                              color: '#dc2626', 
                              fontSize: '16px',
                              animation: 'pulse 1.5s infinite' 
                            }}></span>
                          )}
                          <strong style={{ 
                            color: item?.categoria === 'vencido' ? '#fca5a5' : 'inherit' 
                          }}>
                            {item?.tipo} - {item?.numero}
                          </strong>
                        </div>
                        <div className="muted" style={{ 
                          color: item?.categoria === 'vencido' ? '#dc2626' : 'inherit',
                          fontWeight: item?.categoria === 'vencido' ? '500' : 'normal'
                        }}>
                          {item?.linea || 'Sin línea'}
                        </div>
                        <div className="muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                          {item?.tipo_mantenimiento}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <div className={`badge ${item?.estado === 'Operando' ? 'activo' : item?.estado === 'Baja' ? 'baja' : 'reparacion'}`}>
                            {item?.estado}
                          </div>
                        </div>
                        {item?.categoria === 'vencido' && (
                          <div className="tag danger" style={{ marginTop: '8px' }}>
                            ⚠️ Vencido
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      {/* Show each maintenance entry for this numero */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {entries.map((e, idx) => (
                          <div key={idx} style={{ padding: '6px 8px', borderRadius: 6, background: '#071127' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.tipo_mantenimiento}</div>
                              <div className="muted">Próx: {formatDate(e.sm) || 'N/A'}</div>
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>Últ: {formatDate(e.fm) || 'N/A'} — Estado: {e.estado}</div>
                          </div>
                        ))}
                      </div>

                      {item?.estado === 'Operando' && item?.sm && item?.categoria !== 'vencido' && (
                        <div style={{ marginTop: 8 }}><ProgressBar startDate={item.fm} dueDate={item.sm} /></div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* Modal de detalle */}
        {detailItem && (
          <div className="detail-modal-overlay" onClick={() => setDetailItem(null)}>
            <div className="detail-modal-large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Cabezal {detailItem.tipo} - {detailItem.numero}</h2>
                <button className="modal-close" onClick={() => setDetailItem(null)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="detail-grid">
                  <div className="detail-info">
                    <div className="info-row">
                      <span className="label">Estado:</span>
                        <span className={`badge ${detailItem.estado === 'Operando' ? 'activo' : detailItem.estado === 'Baja' ? 'baja' : 'reparacion'}`}>
                        {detailItem.estado}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Tipo:</span>
                      <span>{detailItem.tipo}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Línea:</span>
                      <span>{detailItem.linea || 'Sin asignar'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Tipo Mantenimiento:</span>
                      <span>{detailItem.tipo_mantenimiento}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Último mantenimiento:</span>
                      <span>{formatDate(detailItem.fm) || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Próximo mantenimiento:</span>
                      <span>{formatDate(detailItem.sm) || 'N/A'}</span>
                    </div>

                    {detailItem.estado === 'Operando' && detailItem.sm && (
                      <div style={{ marginTop: 20 }}>
                        <h4>Progreso de Tiempo</h4>
                        <ProgressBar startDate={detailItem.fm} dueDate={detailItem.sm} />
                      </div>
                    )}
                  </div>
                  
                  <div className="detail-checks">
                    <h4>Verificaciones Últimas</h4>
                    <div className="checks-grid">
                      {getVerifications(detailItem.tipo, detailItem.tipo_mantenimiento).map((label, idx) => {
                        const fieldName = idx === 0 ? 'op' : `op${idx}`
                        const isChecked = !!detailItem[fieldName]
                        return (
                          <div key={idx} className={`check-item ${isChecked ? 'check-ok' : 'check-no'}`}>
                            <span className="check-icon">{isChecked ? '✓' : '✗'}</span>
                            <span>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="detail-observations">
                  <h4>Observaciones</h4>
                  <div className="observations-content">
                    {detailItem.observaciones || 'Sin observaciones'}
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                {detailItem.estado !== 'Baja' && (
                  <>
                    <button className="btn success" onClick={() => openMaintenanceForm(detailItem)}>
                      Registrar Mantenimiento
                    </button>
                    <button className="btn secondary" onClick={() => openEdit(detailItem)}>
                      Editar
                    </button>
                    <button className="btn danger" onClick={() => openBajaForm(detailItem)}>
                      Dar de Baja
                    </button>
                  </>
                )}
                {detailItem.estado === 'Baja' && (
                  <button className="btn warning" onClick={() => openReactivarForm(detailItem)}>
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para registrar mantenimiento */}
        {showMaintenanceForm && (
          <div className="detail-modal-overlay" onClick={() => setShowMaintenanceForm(false)}>
            <div className="maintenance-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Registrar Mantenimiento - {showMaintenanceForm.tipo} {showMaintenanceForm.numero}</h3>
                <button className="modal-close" onClick={() => setShowMaintenanceForm(false)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="form-grid">
                  <label className="half">
                    <div className="muted">Tipo de mantenimiento</div>
                    <select 
                      className="input select" 
                      value={maintenanceForm.tipo_mantenimiento} 
                      onChange={e => setMaintenanceForm({...maintenanceForm, tipo_mantenimiento: e.target.value, ops: {}})}
                    >
                      {getTipoMantenimientoOptions(showMaintenanceForm.tipo).map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </label>

                  <label className="half">
                    <div className="muted">Fecha del mantenimiento</div>
                    <input 
                      className="input" 
                      type="date" 
                      value={maintenanceForm.fecha_mantenimiento} 
                      onChange={e => setMaintenanceForm({...maintenanceForm, fecha_mantenimiento: e.target.value})} 
                    />
                  </label>

                  <label className="half">
                    <div className="muted">Ubicación</div>
                    <select className="input select" value={maintenanceForm.ubicacion} onChange={e => setMaintenanceForm({...maintenanceForm, ubicacion: e.target.value})}>
                      <option value="Linea">Linea</option>
                      <option value="Tool Room">Tool Room</option>
                    </select>
                  </label>

                  <label className="half">
                    <div className="muted">Estado</div>
                    <select className="input select" value={maintenanceForm.estado} onChange={e => setMaintenanceForm({...maintenanceForm, estado: e.target.value})}>
                      <option value="Operando">Operando</option>
                      <option value="Por reparar">Por reparar</option>
                      <option value="Baja">Baja</option>
                      <option value="Resguardo">Resguardo</option>
                    </select>
                  </label>

                  <label className="full">
                    <div className="muted">Fecha del próximo mantenimiento</div>
                    <input 
                      className="input" 
                      type="date" 
                      value={maintenanceForm.fecha_proximo} 
                      onChange={e => setMaintenanceForm({...maintenanceForm, fecha_proximo: e.target.value})} 
                    />
                  </label>

                  <div className="full">
                    <div style={{ marginBottom: 8, fontWeight: 600, color: '#cbd5e1' }}>
                      Puntos de verificación para {showMaintenanceForm.tipo} - {maintenanceForm.tipo_mantenimiento}:
                    </div>
                    <div className="checks">
                      {getVerifications(showMaintenanceForm.tipo, maintenanceForm.tipo_mantenimiento).map((label, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input 
                            type="checkbox" 
                            checked={!!maintenanceForm.ops[`op${idx}`]} 
                            onChange={() => toggleMaintenanceOp(`op${idx}`)} 
                          /> 
                          {label}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: '#f59e0b' }}>
                      ⚠️ NOTA: Si no cumple con alguna verificación, el cabezal irá a reparación
                    </div>
                  </div>

                  <div className="full">
                    <textarea 
                      className="input" 
                      placeholder="Observaciones del mantenimiento" 
                      value={maintenanceForm.observaciones} 
                      onChange={e => setMaintenanceForm({...maintenanceForm, observaciones: e.target.value})} 
                      rows="4"
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn success" onClick={saveMantenimiento}>Registrar Mantenimiento</button>
                <button className="btn secondary" onClick={() => setShowMaintenanceForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para dar de baja */}
        {showBajaForm && (
          <div className="detail-modal-overlay" onClick={() => setShowBajaForm(false)}>
            <div className="baja-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Dar de Baja - {showBajaForm.tipo} {showBajaForm.numero}</h3>
                <button className="modal-close" onClick={() => setShowBajaForm(false)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="form-grid">
                  <div className="full">
                    <label>
                      <div className="muted" style={{ marginBottom: 8 }}>Motivo de la baja (obligatorio)</div>
                      <textarea 
                        className="input" 
                        placeholder="Describe el motivo por el cual se da de baja este cabezal..." 
                        value={bajaForm.motivo} 
                        onChange={e => setBajaForm({ motivo: e.target.value })} 
                        rows="4"
                        required
                      />
                    </label>
                  </div>
                  <div className="full" style={{ 
                    padding: 12, 
                    background: 'rgba(239,68,68,0.1)', 
                    border: '1px solid rgba(239,68,68,0.3)', 
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#fecaca'
                  }}>
                    NOTA: Una vez dado de baja, el cabezal puede ser reactivado más tarde si es necesario
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn danger" onClick={darDeBaja}>Dar de Baja</button>
                <button className="btn secondary" onClick={() => setShowBajaForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para reactivar cabezal */}
        {showReactivarForm && (
          <div className="detail-modal-overlay" onClick={() => setShowReactivarForm(false)}>
            <div className="maintenance-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reactivar Cabezal - {showReactivarForm.tipo} {showReactivarForm.numero}</h3>
                <button className="modal-close" onClick={() => setShowReactivarForm(false)}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="form-grid">
                  <label className="half">
                    <div className="muted">Tipo de mantenimiento</div>
                    <select 
                      className="input select" 
                      value={reactivarForm.tipo_mantenimiento} 
                      onChange={e => setReactivarForm({...reactivarForm, tipo_mantenimiento: e.target.value, ops: {}})}
                    >
                      {getTipoMantenimientoOptions(showReactivarForm.tipo).map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </label>

                  <label className="half">
                    <div className="muted">Fecha de reactivación</div>
                    <input 
                      className="input" 
                      type="date" 
                      value={reactivarForm.fecha_reactivacion} 
                      onChange={e => setReactivarForm({ ...reactivarForm, fecha_reactivacion: e.target.value })} 
                    />
                  </label>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '16px', color: '#cbd5e1', fontSize: '16px' }}>
                    Puntos de verificación para {showReactivarForm.tipo} - {reactivarForm.tipo_mantenimiento}:
                  </h4>
                  <div className="checks">
                    {getVerifications(showReactivarForm.tipo, reactivarForm.tipo_mantenimiento).map((label, i) => (
                      <label key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        color: '#cbd5e1',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '8px'
                      }}>
                        <input 
                          type="checkbox" 
                          checked={!!reactivarForm.ops[`op${i}`]} 
                          onChange={() => toggleReactivarOp(`op${i}`)} 
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    background: 'rgba(245,158,11,0.1)', 
                    border: '1px solid #f59e0b',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#f59e0b'
                  }}>
                    ⚠️ NOTA: Si no cumple con alguna verificación, el cabezal irá a reparación
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: '20px' }}>
                  <label className="full">
                    <div className="muted" style={{ marginBottom: 8 }}>Observaciones de la reactivación (obligatorio)</div>
                    <textarea 
                      className="input" 
                      placeholder="Observaciones de la reactivación" 
                      value={reactivarForm.observaciones} 
                      onChange={e => setReactivarForm({ ...reactivarForm, observaciones: e.target.value })}
                      rows="4"
                      style={{ resize: 'vertical' }}
                    />
                  </label>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn success" onClick={saveReactivacion}>Reactivar Cabezal</button>
                <button className="btn secondary" onClick={() => setShowReactivarForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
