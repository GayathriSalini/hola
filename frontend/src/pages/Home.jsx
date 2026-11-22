import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addToHistory, getToken, setToken } from '../api'

export default function Home() {
  const nav = useNavigate()
  const [code, setCode] = useState('')

  const join = async (c) => {
    c = c.trim()
    if (!c) return
    try { await addToHistory(getToken(), c) } catch { /* history is best-effort */ }
    nav(`/meet/${encodeURIComponent(c)}`)
  }
  const instant = () => join(Math.random().toString(36).slice(2, 8))
  const logout = () => { setToken(null); nav('/') }

  return (
    <div className="landing">
      <header className="nav">
        <Link to="/" className="brand">hola<span>.</span></Link>
        <div className="nav-actions">
          <Link className="link" to="/history">History</Link>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="home">
        <div className="card">
          <p className="eyebrow">Ready when you are</p>
          <h2>Start a new conversation</h2>
          <p>Create an instant room and share the code.</p>
          <button className="btn big" onClick={instant}>Start instant meeting</button>
        </div>
        <form className="card" onSubmit={(e) => { e.preventDefault(); join(code) }}>
          <p className="eyebrow">Have a room code?</p>
          <h2>Join a meeting</h2>
          <input placeholder="Meeting code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn" disabled={!code.trim()}>Join</button>
        </form>
      </main>
    </div>
  )
}
