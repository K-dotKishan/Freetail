import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react'
import { register } from '../api/authApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/Spinner'

export default function Register() {
  const { signIn } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', display_name: '', email: '', password: '', password2: ''
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    // Client-side password match check
    if (form.password !== form.password2) {
      setErrors({ password2: ['Passwords do not match.'] })
      return
    }

    setLoading(true)
    try {
      const res = await register(form)
      const { tokens, user } = res.data

      // Store tokens FIRST so any subsequent authenticated requests work
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)

      signIn(tokens, user)
      toast('Account created — welcome!', 'success')
      navigate('/dashboard')
    } catch (err) {
      // Clear any tokens stored on a failed attempt
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')

      if (!err.response) {
        // Network error — backend not running
        setGeneralError('Cannot reach the server. Make sure the backend is running on port 8000.')
        return
      }

      const data = err.response.data || {}
      // Django REST returns field errors as { field: ["message"] }
      if (typeof data === 'object' && !Array.isArray(data)) {
        const fieldErrors = {}
        let hasFieldError = false
        for (const [key, val] of Object.entries(data)) {
          if (key === 'detail') {
            setGeneralError(val)
          } else {
            fieldErrors[key] = Array.isArray(val) ? val : [val]
            hasFieldError = true
          }
        }
        if (hasFieldError) setErrors(fieldErrors)
        if (!hasFieldError && !data.detail) {
          setGeneralError('Registration failed. Please check your details.')
        }
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (key, label, placeholder, type = 'text') => (
    <div className="field-group">
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={set(key)}
        required
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
      {errors[key] && (
        <p className="text-xs text-rose-400 mt-1">{errors[key][0]}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-brand flex items-center justify-center shadow-glow mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SplitSpace</h1>
          <p className="text-white/40 mt-1 text-sm">Create your account</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-white mb-1">Get started</h2>
          <p className="text-white/40 text-sm mb-6">Fill in your details below</p>

          {/* General / network error */}
          {generalError && (
            <div className="alert-error mb-4">
              <span className="text-xs">{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('username', 'Username', 'aisha')}
              {field('display_name', 'Display Name', 'Aisha')}
            </div>

            {field('email', 'Email', 'aisha@example.com', 'email')}

            {/* Password */}
            <div className="field-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 mt-1">{errors.password[0]}</p>
              )}
            </div>

            {/* Confirm password */}
            <div className="field-group">
              <label className="label">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat password"
                value={form.password2}
                onChange={set('password2')}
                required
                autoComplete="new-password"
              />
              {errors.password2 && (
                <p className="text-xs text-rose-400 mt-1">{errors.password2[0]}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full btn-lg justify-center"
              disabled={loading}
            >
              {loading
                ? <><Spinner size="sm" className="text-white" /> Creating account…</>
                : <><UserPlus size={17} /> Create account</>
              }
            </button>
          </form>

          <div className="divider" />

          <p className="text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
