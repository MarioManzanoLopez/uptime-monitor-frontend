import { useEffect, useState } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

const API_URL = 'https://uptime-monitor-production-5f18.up.railway.app'

interface CheckData {
  id: number
  site_name: string
  url: string
  status: string
  status_code: number | null
  response_time: number | null
  checked_at: string
}

interface SiteData {
  name: string
  url: string
}

function App() {
  const [sites, setSites] = useState<SiteData[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [checks, setChecks] = useState<CheckData[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadSites = () => {
    axios.get(`${API_URL}/sites`).then(res => {
      setSites(res.data)
      if (res.data.length > 0 && !selectedSite) {
        setSelectedSite(res.data[0].name)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    if (!selectedSite) return
    axios.get(`${API_URL}/checks/${selectedSite}`).then(res => {
      setChecks(res.data.reverse())
    })
  }, [selectedSite])

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!newName.trim() || !newUrl.trim()) {
      setFormError('Completa ambos campos')
      return
    }

    let formattedUrl = newUrl.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    setSubmitting(true)
    try {
      await axios.post(`${API_URL}/sites`, {
        name: newName.trim(),
        url: formattedUrl
      })
      setNewName('')
      setNewUrl('')
      setShowForm(false)
      loadSites()
      setSelectedSite(newName.trim())
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al agregar el sitio')
    } finally {
      setSubmitting(false)
    }
  }

  const latestCheck = checks[checks.length - 1]

  const avgResponseTime = checks.length
    ? (checks.reduce((sum, c) => sum + (c.response_time || 0), 0) / checks.length * 1000).toFixed(0)
    : '—'

  const uptimePercent = checks.length
    ? ((checks.filter(c => c.status === 'up').length / checks.length) * 100).toFixed(1)
    : '—'

  const chartData = checks.map(c => ({
    time: new Date(c.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    response_time: c.response_time ? Math.round(c.response_time * 1000) : 0
  }))

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Uptime Monitor</h1>
          <div className="subtitle">Monitoreo de disponibilidad en tiempo real</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {sites.length > 0 && (
            <select
              className="site-selector"
              value={selectedSite}
              onChange={e => setSelectedSite(e.target.value)}
            >
              {sites.map(site => (
                <option key={site.name} value={site.name}>{site.name}</option>
              ))}
            </select>
          )}
          <button className="add-site-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Agregar sitio'}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="add-site-form" onSubmit={handleAddSite}>
          <input
            type="text"
            placeholder="Nombre (ej. Mi API)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            type="text"
            placeholder="URL (ej. midominio.com)"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Agregando...' : 'Agregar'}
          </button>
          {formError && <div className="form-error">{formError}</div>}
        </form>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="icon">⏳</div>
          Cargando datos...
        </div>
      ) : sites.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📡</div>
          Aún no tienes sitios. Agrega uno con el botón de arriba.
        </div>
      ) : !latestCheck ? (
        <div className="empty-state">
          <div className="icon">⏳</div>
          Aún no hay checks para este sitio. Espera unos segundos y recarga.
        </div>
      ) : (
        <>
          <div className="status-grid">
            <div className="status-card">
              <div className="label">Estado actual</div>
              <div className={`status-pill ${latestCheck.status}`}>
                <span className={`status-dot ${latestCheck.status}`}></span>
                {latestCheck.status === 'up' ? 'Activo' : 'Caído'}
              </div>
            </div>

            <div className="status-card">
              <div className="label">Uptime</div>
              <div className="value">{uptimePercent}%</div>
            </div>

            <div className="status-card">
              <div className="label">Tiempo de respuesta</div>
              <div className="value">
                {latestCheck.response_time ? `${(latestCheck.response_time * 1000).toFixed(0)} ms` : '—'}
              </div>
            </div>

            <div className="status-card">
              <div className="label">Promedio</div>
              <div className="value">{avgResponseTime} ms</div>
            </div>
          </div>

          <div className="chart-section">
            <h2>Historial de tiempo de respuesta</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: '#1e2330', border: '1px solid #262b38', borderRadius: 8 }}
                  labelStyle={{ color: '#8b8f99' }}
                />
                <Line
                  type="monotone"
                  dataKey="response_time"
                  stroke="#5b8def"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

export default App