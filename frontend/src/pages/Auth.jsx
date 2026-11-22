import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login, register, setToken } from '../api'

export default function Auth() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [isRegister, setIsRegister] = useState(params.get('mode') === 'register')
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (isRegister) {
        await register(form.name, form.username, form.password)
        setInfo('Account created. Please log in.')
        setIsRegister(false)
      } else {
        const { token } = await login(form.username, form.password)
        setToken(token)
        nav('/home')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <Link to="/" className="brand">hola<span>.</span></Link>
        <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
        {isRegister && <input placeholder="Full name" value={form.name} onChange={set('name')} required />}
        <input placeholder="Username" value={form.username} onChange={set('username')} required autoComplete="username" />
        <input placeholder="Password" type="password" value={form.password} onChange={set('password')} required autoComplete={isRegister ? 'new-password' : 'current-password'} />
        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Register' : 'Login'}</button>
        <button type="button" className="link" onClick={() => { setIsRegister(!isRegister); setError('') }}>
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </form>
    </div>
  )
}
