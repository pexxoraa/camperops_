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

  return <div className="login-screen">
    <div className="login-card">
      <div className="login-brand"><span className="brand-mark large">P</span><div><h1>PolarOps</h1><p>Integrated Polar Expedition Logistics & Asset Management</p></div></div>
      <div className="login-region-grid"><div>ANTARCTIC / SOUTH</div><div>ARCTIC / NORTH</div></div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <form onSubmit={submit} className="login-form">
        <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="button primary wide-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to command console'}</button>
      </form>
      <p className="demo-note">Local demo: commander / logistics / field accounts are seeded. Data marked demo remains synthetic.</p>
    </div>
  </div>
}
