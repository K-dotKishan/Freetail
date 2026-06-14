import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react'
import { login, getMe } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/Spinner'

export default function Login() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(form.username, form.password)
      const tokens = { access: res.data.access, refresh: res.data.refresh }
      // Store tokens FIRST — getMe() needs the Authorization header
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      const me = await getMe()
      signIn(tokens, me.data)
      toast('Welcome back!', 'success')
      navigate('/dashboard')
    } catch (err) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 8000.')
      } else {
        setError(err.response?.data?.detail || 'Invalid username or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-brand flex items-center justify-center shadow-glow mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SplitSpace</h1>
          <p className="text-white/40 mt-1 text-sm">Shared expenses, simplified</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-white/40 text-sm mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="alert-error mb-4">
              <span className="text-xs">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="field-group">
              <label className="label">Username</label>
              <input
                className="input"
                placeholder="aisha"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full btn-lg justify-center" disabled={loading}>
              {loading ? <Spinner size="sm" className="text-white" /> : <LogIn size={17} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-white/40">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1 transition-colors">
              Create one <ArrowRight size={13} />
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-center">
          <p className="text-xs text-brand-300/70">
            Demo: username <span className="font-mono text-brand-300">aisha</span> / password <span className="font-mono text-brand-300">password123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
