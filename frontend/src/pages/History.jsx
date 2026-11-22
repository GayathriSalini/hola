import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory, getToken } from '../api'

export default function History() {
  const nav = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getHistory(getToken()).then(setItems).catch((e) => setError(e.message))
  }, [])

  return (
    <div className="landing">
      <header className="nav">
        <Link to="/" className="brand">hola<span>.</span></Link>
        <Link className="btn" to="/home">Back</Link>
      </header>
      <main className="home single">
        <h2>Meeting history</h2>
        {error && <p className="error">{error}</p>}
        {!items && !error && <p>Loading…</p>}
        {items && items.length === 0 && <p>No meetings yet.</p>}
        {items && items.map((m) => (
          <div className="card row" key={m._id}>
            <div><strong>{m.meetingCode}</strong><small>{new Date(m.date).toLocaleString()}</small></div>
            <button className="btn" onClick={() => nav(`/meet/${encodeURIComponent(m.meetingCode)}`)}>Rejoin</button>
          </div>
        ))}
      </main>
    </div>
  )
}
