import React, { useEffect, useState, useMemo } from 'react'
import api from '../api'
import '../styles.css'

const DEFAULT_COLORS = ['Rojo','Verde','Azul','Amarillo','Gris']
const TIPOS_MANTENIMIENTO = ['Semanal', 'Mensual', 'Semestral', 'Año y Medio']
const LINEAS = ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5', 'Línea 6']

const OP_LABELS = [
  'Limpieza general',
  'Revisión tornillería',
  'Estado de código/etiquetas',
  'Esponjas y elementos flexibles',
  'Integridad de láminas',
  'Vías plásticas',
  'Estado de protecciones',
  'Lubricación',
  'Sensores',
  'Actuadores',
  'Conectores eléctricos',
  'Verificación funcional'
]

// Helper function to get local date in YYYY-MM-DD format
function getTodayLocal() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getColorHex(colorName) {
  const colorMap = {
    'Rojo': '#dc2626',
    'Verde': '#16a34a', 
    'Azul': '#2563eb',
    'Amarillo': '#eab308',
    'Gris': '#6b7280'
  }
  return colorMap[colorName] || '#6b7280'
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

function ProgressBar({ startDate, dueDate, tipo }) {
  const now = new Date()
  
  // Handle different date formats
  const start = new Date(startDate)
  const due = new Date(dueDate)
  
  if (isNaN(start) || isNaN(due)) {
    return null
  }
  
  const totalDuration = due - start
  const elapsed = now - start
  const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)
  
  let colorClass = 'bg-green-500'
  if (progress > 85) colorClass = 'bg-red-500'
  else if (progress > 70) colorClass = 'bg-yellow-500'
  
  return (
    <div className="progress-bar">
      <div 
        className={`progress-fill ${colorClass}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  )
}

function MaintenanceModal({ isOpen, onClose, item, onSave }) {
  const [formData, setFormData] = useState({
    numero: '',
    linea: '',
    color: 'Rojo',
    tipo_mantenimiento: 'Mensual',
    fm: getTodayLocal(),
    sm: '',
    ops: {},
    observaciones: ''
  })

  useEffect(() => {
    if (item) {
      // Edit mode
      const ops = {}
      for (let i = 0; i <= 11; i++) {
        const key = i === 0 ? 'op' : `op${i}`
        ops[`op${i}`] = !!item[key]
      }
      
      setFormData({
        numero: item.numero || '',
        linea: item.linea || '',
        color: item.color || 'Rojo',
        tipo_mantenimiento: item.tipo_mantenimiento || 'Mensual',
        fm: item.fm ? item.fm.split('T')[0] : getTodayLocal(),
        sm: item.sm ? item.sm.split('T')[0] : '',
        ops,
        observaciones: item.observaciones || ''
      })
    } else {
      // New mode
      setFormData({
        numero: '',
        linea: '',
        color: 'Rojo',
        tipo_mantenimiento: 'Mensual',
        fm: getTodayLocal(),
        sm: '',
        ops: {},
        observaciones: ''
      })
    }
  }, [item])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error al guardar: ' + error.message)
    }
  }

  const handleOpChange = (opKey, checked) => {
    setFormData(prev => ({
      ...prev,
      ops: {
        ...prev.ops,
        [opKey]: checked
      }
    }))
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {item ? 'Editar Cabezal' : 'Nuevo Cabezal'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="form-section">
              <h3>Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Número</label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData(prev => ({...prev, numero: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Línea</label>
                  <select
                    value={formData.linea}
                    onChange={(e) => setFormData(prev => ({...prev, linea: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  >
                    <option value="">Seleccionar línea</option>
                    {LINEAS.map(linea => (
                      <option key={linea} value={linea}>{linea}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({...prev, color: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {DEFAULT_COLORS.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Mantenimiento</label>
                  <select
                    value={formData.tipo_mantenimiento}
                    onChange={(e) => setFormData(prev => ({...prev, tipo_mantenimiento: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {TIPOS_MANTENIMIENTO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="form-section">
              <h3>Fechas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Mantenimiento</label>
                  <input
                    type="date"
                    value={formData.fm}
                    onChange={(e) => setFormData(prev => ({...prev, fm: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Próximo Mantenimiento (opcional)</label>
                  <input
                    type="date"
                    value={formData.sm}
                    onChange={(e) => setFormData(prev => ({...prev, sm: e.target.value}))}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si se deja vacío, se calculará automáticamente según el tipo
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="form-section">
              <h3>Lista de Verificación</h3>
              <div className="checkbox-grid">
                {OP_LABELS.map((label, index) => (
                  <div
                    key={index}
                    className={`checkbox-item ${formData.ops[`op${index}`] ? 'checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.ops[`op${index}`] || false}
                      onChange={(e) => handleOpChange(`op${index}`, e.target.checked)}
                    />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div className="form-section">
              <h3>Observaciones</h3>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({...prev, observaciones: e.target.value}))}
                className="w-full p-2 border border-gray-300 rounded"
                rows="3"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {item ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Mantenimientos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTipo, setFilterTipo] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await api.get('/mantenimientos')
      setItems(data)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter and search logic
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        item.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.linea?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' || item.categoria === filterStatus
      const matchesTipo = filterTipo === 'all' || item.tipo_mantenimiento === filterTipo

      return matchesSearch && matchesStatus && matchesTipo
    })
  }, [items, searchTerm, filterStatus, filterTipo])

  // Group items by status
  const groupedItems = useMemo(() => {
    const groups = {
      vencido: [],
      proximo_vencer: [],
      activo: [],
      reparacion: [],
      baja: []
    }

    filteredItems.forEach(item => {
      groups[item.categoria]?.push(item)
    })

    return groups
  }, [filteredItems])

  // Save item (create or update)
  const saveItem = async (formData) => {
    try {
      if (editingItem) {
        await api.put(`/mantenimientos/${editingItem.id}`, formData)
      } else {
        await api.post('/mantenimientos', formData)
      }
      await fetchData()
      setEditingItem(null)
    } catch (error) {
      throw error
    }
  }

  // Delete item
  const deleteItem = async (id) => {
    if (confirm('¿Está seguro de eliminar este cabezal?')) {
      try {
        await api.delete(`/mantenimientos/${id}`)
        await fetchData()
      } catch (error) {
        console.error('Error deleting:', error)
        alert('Error al eliminar')
      }
    }
  }

  // Mark as repaired
  const markAsRepaired = async (id) => {
    try {
      await api.post(`/mantenimientos/${id}/reparar`)
      await fetchData()
    } catch (error) {
      console.error('Error marking as repaired:', error)
      alert('Error al marcar como reparado')
    }
  }

  const getStatusLabel = (categoria) => {
    const labels = {
      vencido: 'Vencido',
      proximo_vencer: 'Próximo a Vencer',
      activo: 'Activo',
      reparacion: 'En Reparación',
      baja: 'Dado de Baja'
    }
    return labels[categoria] || categoria
  }

  const getStatusClass = (categoria) => {
    return `status-${categoria}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por número o línea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            >
              <option value="all">Todos los estados</option>
              <option value="vencido">Vencidos</option>
              <option value="proximo_vencer">Próximos a Vencer</option>
              <option value="activo">Activos</option>
              <option value="reparacion">En Reparación</option>
              <option value="baja">Dados de Baja</option>
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            >
              <option value="all">Todos los tipos</option>
              {TIPOS_MANTENIMIENTO.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditingItem(null)
                setShowModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Nuevo Cabezal
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(groupedItems).map(([status, statusItems]) => (
          <div key={status} className="bg-white p-4 rounded-lg shadow">
            <div className={`text-center p-2 rounded ${getStatusClass(status)}`}>
              <div className="text-lg font-bold">{statusItems.length}</div>
              <div className="text-sm">{getStatusLabel(status)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([status, statusItems]) => {
          if (statusItems.length === 0) return null

          return (
            <div key={status} className="bg-white rounded-lg shadow">
              <div className={`p-4 rounded-t-lg ${getStatusClass(status)}`}>
                <h2 className="text-xl font-bold">{getStatusLabel(status)} ({statusItems.length})</h2>
              </div>
              <div className="p-4">
                <div className="grid gap-4">
                  {statusItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="color-indicator"
                              style={{ backgroundColor: getColorHex(item.color) }}
                            />
                            <h3 className="text-lg font-semibold">Cabezal {item.numero}</h3>
                            <span className="text-sm text-gray-600">
                              {item.linea} • {item.tipo_mantenimiento}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <strong>Último Mantenimiento:</strong><br/>
                              {formatDate(item.fm)}
                            </div>
                            <div>
                              <strong>Próximo Mantenimiento:</strong><br/>
                              {formatDate(item.sm) || 'No programado'}
                            </div>
                            <div>
                              <strong>Estado:</strong><br/>
                              {item.estado}
                            </div>
                          </div>

                          {item.fm && item.sm && (
                            <div className="mt-2">
                              <ProgressBar 
                                startDate={item.fm} 
                                dueDate={item.sm}
                                tipo={item.tipo_mantenimiento}
                              />
                            </div>
                          )}

                          {item.observaciones && (
                            <div className="mt-2 text-sm text-gray-600">
                              <strong>Observaciones:</strong> {item.observaciones}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(item)
                              setShowModal(true)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Editar
                          </button>
                          
                          {item.estado === 'Por Reparar' && (
                            <button
                              onClick={() => markAsRepaired(item.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Marcar Reparado
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No se encontraron cabezales</div>
        </div>
      )}

      {/* Modal */}
      <MaintenanceModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingItem(null)
        }}
        item={editingItem}
        onSave={saveItem}
      />
    </div>
  )
}