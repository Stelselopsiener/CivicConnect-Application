import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FormField, { inputClasses } from '../components/common/FormField'
import Button from '../components/common/Button'
import ErrorBanner from '../components/common/ErrorBanner'
import { DEMO_ACCOUNTS } from '../services/mock/mockStore'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(form)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not log you in. Check your details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-line bg-paper-raised p-8">
      <h1 className="text-xl font-semibold text-ink">Log in to CivicConnect</h1>
      <p className="mt-1 text-sm text-ink-soft">Track issues you've reported and follow up on updates.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <ErrorBanner message={error} />
        <FormField label="Email" name="email">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Password" name="password">
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>
        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to CivicConnect?{' '}
        <Link to="/register" className="font-medium text-civic-700 hover:underline">
          Create an account
        </Link>
      </p>

      {USE_MOCK && (
        <div className="mt-6 rounded-md border border-line bg-paper px-4 py-3 text-xs text-ink-soft">
          <p className="mb-1.5 font-medium text-ink">Demo accounts (mock mode)</p>
          <ul className="flex flex-col gap-0.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <span className="font-mono">{account.email}</span> / <span className="font-mono">{account.password}</span>{' '}
                <span className="text-ink-soft/70">({account.role})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
