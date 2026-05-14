import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('loginForm')
    return saved ? JSON.parse(saved) : { email: '', password: '' }
  })
  const [error, setError] = useState(() => {
    const saved = localStorage.getItem('loginError')
    return saved ? JSON.parse(saved) : ''
  })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState(() => {
    const saved = localStorage.getItem('loginForm')
    try {
      const parsed = saved ? JSON.parse(saved) : null
      return parsed?.email || ''
    } catch {
      return ''
    }
  })
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Save form to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('loginForm', JSON.stringify(form))
  }, [form])

  // Save error to localStorage whenever it changes
  useEffect(() => {
    if (error) {
      localStorage.setItem('loginError', JSON.stringify(error))
    }
  }, [error])

  const handleChange = (e) => {
    const newForm = { ...form, [e.target.name]: e.target.value }
    setForm(newForm)
  }

  const clearError = () => {
    setError('')
    localStorage.removeItem('loginError') // Also remove from localStorage
  }

  const requestResetToken = async () => {
    if (!resetEmail.trim()) {
      setResetError('Email is required.')
      return
    }

    setResetError('')
    setResetMessage('')
    setResetLoading(true)
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email: resetEmail.trim() })
      setResetToken(data.resetToken)
      setResetMessage('Reset token generated. Use it below to set a new password.')
    } catch (err) {
      setResetError(err.response?.data?.message || 'Could not generate reset token.')
    } finally {
      setResetLoading(false)
    }
  }

  const submitResetPassword = async () => {
    if (!resetEmail.trim() || !resetToken.trim() || !newPassword || !confirmPassword) {
      setResetError('Email, token, and new password are required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.')
      return
    }

    setResetError('')
    setResetMessage('')
    setResetLoading(true)
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        email: resetEmail.trim(),
        token: resetToken.trim(),
        newPassword,
      })
      setResetMessage(data.message || 'Password reset successfully.')
      setForgotMode(false)
      setForm({ email: resetEmail.trim(), password: '' })
      setNewPassword('')
      setConfirmPassword('')
      setResetToken('')
      localStorage.setItem('loginForm', JSON.stringify({ email: resetEmail.trim(), password: '' }))
    } catch (err) {
      setResetError(err.response?.data?.message || 'Could not reset password.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', form)
      login(data.token, data.user)
      localStorage.removeItem('loginError') // Also clear error
      localStorage.removeItem('loginForm') // Clear saved form on successful login
      navigate('/lobby')
    } catch (err) {
      const remainingAttempts = err.response?.data?.remainingAttempts
      const baseMessage = err.response?.data?.message || 'Login failed. Please try again.'
      setError(
        typeof remainingAttempts === 'number'
          ? `${baseMessage} Remaining attempts: ${remainingAttempts}.`
          : baseMessage
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-1">Sign in to continue chatting</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-700 pt-5">
            {!forgotMode ? (
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true)
                  setResetError('')
                  setResetMessage('')
                  setResetEmail(form.email || '')
                }}
                className="w-full text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Forgot password?
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-200">Reset password</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false)
                      setResetError('')
                      setResetMessage('')
                    }}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    Back to login
                  </button>
                </div>

                {resetError && (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">
                    {resetError}
                  </div>
                )}
                {resetMessage && (
                  <div className="p-3 bg-green-900/30 border border-green-700 rounded-xl text-green-300 text-sm space-y-2">
                    <div>{resetMessage}</div>
                    {resetToken && (
                      <div className="font-mono text-xs break-all bg-gray-900/40 p-2 rounded-lg border border-green-800">
                        Reset token: {resetToken}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={requestResetToken}
                    disabled={resetLoading}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white font-semibold rounded-xl transition"
                  >
                    {resetLoading ? 'Generating token…' : 'Generate reset token'}
                  </button>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Reset token</label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token here"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={submitResetPassword}
                    disabled={resetLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all"
                  >
                    {resetLoading ? 'Resetting…' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
