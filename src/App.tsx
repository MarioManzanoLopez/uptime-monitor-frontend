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

function App() {
  const [sites, setSites] = useState<string[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [checks, setChecks] = useState<CheckData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API_URL}/sites`).then(res => {
      setSites(res.data)
      if (res.data.length > 0) setSelectedSite(res.data[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedSite) return
    axios.get(`${API_URL}/checks/${selectedSite}`).then(res => {
      setChecks(res.data.reverse())
    })
  }, [selectedSite])

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
        {sites.length > 0 && (
          <select
            className="site-selector"
            value={selectedSite}
            onChange={e => setSelectedSite(e.target.value)}
          >
            {sites.map(site => (
              <option key={site} value={site}>{site}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="icon">⏳</div>
          Cargando datos...
        </div>
      ) : !latestCheck ? (
        <div className="empty-state">
          <div className="icon">📡</div>
          Aún no hay datos. Espera a que corra el primer check automático,
          <br />o dispáralo manualmente desde <code>/docs</code>.
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