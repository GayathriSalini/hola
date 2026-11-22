import { Link, useNavigate } from 'react-router-dom'
import { getToken } from '../api'

export default function Landing() {
  const nav = useNavigate()
  const loggedIn = !!getToken()
  const guest = () => nav(`/meet/${Math.random().toString(36).slice(2, 8)}`)

  return (
    <div className="landing">
      <header className="nav">
        <Link to="/" className="brand">hola<span>.</span></Link>
        <div className="nav-actions">
          <button className="link" onClick={guest}>Join as guest</button>
          {loggedIn
            ? <Link className="btn" to="/home">Dashboard</Link>
            : <><Link className="link" to="/auth?mode=register">Register</Link><Link className="btn" to="/auth">Login</Link></>}
        </div>
      </header>
      <main className="hero">
        <div>
          <h1>Connect with <em>your people</em>, wherever they are.</h1>
          <p>Simple, fast video meetings with chat and screen sharing. No downloads — just share a code.</p>
          <Link className="btn big" to={loggedIn ? '/home' : '/auth'}>Get started</Link>
        </div>
        <div className="hero-art">
          {[['alex', 'Alex'], ['jamie', 'Jamie'], ['maya', 'Maya'], ['tara', 'Tara']].map(([f, n]) => (
            <figure className="tile" key={f}>
              <img src={`/people/${f}.svg`} alt={n} />
              <figcaption>{n}</figcaption>
            </figure>
          ))}
        </div>
      </main>
    </div>
  )
}
