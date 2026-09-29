import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('commander@polarops.local')
  const [password, setPassword] = useState('PolarOps123!')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await login(email, password) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return <div className="login-shell">
    <section className="login-visual" aria-label="PolarOps platform overview">
      <div className="login-brand">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">P</span>
          <div><strong>PolarOps</strong><span>Expedition command platform</span></div>
        </div>
      </div>
      <div className="login-copy">
        <div className="eyebrow">ANTARCTIC / SOUTH · ARCTIC / NORTH</div>
        <h1>Polar logistics, readiness, and field operations in one console.</h1>
        <p>Coordinate expedition personnel, cargo, vehicles, routes, incidents, science activity, and operational readiness from a single local command workspace.</p>
        <div className="capability-strip" aria-label="Platform capabilities">
          <span>Logistics</span><span>Field operations</span><span>Incident response</span><span>Offline ready</span>
        </div>
      </div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="eyebrow">Secure local access</div>
        <h2>Command console</h2>
        <p>Sign in with a seeded local demo account to continue.</p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="button primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to command console'}</button>
        </form>
        <div className="login-help">
          <strong>Local demo access</strong>
          <p className="security-note">Commander, logistics, and field accounts are seeded locally. Data marked demo remains synthetic.</p>
        </div>
      </div>
    </section>
  </div>
}
