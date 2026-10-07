import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authGateway, isDemoMode } from '../../services'
import { ERROR_CODE } from '../../services/AppError'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../services/mock/mockDb'
import { homeFor } from '../../domain/navigation'
import { PASSWORD_MIN, registerSchema, signInSchema, validate } from '../../domain/validation'
import Banner from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Field, { PasswordInput } from '../../components/common/Field'

const tabClass = (active) =>
  `flex-1 border-b-[3px] pb-3 text-center text-lg font-semibold ${
    active ? 'border-civic-500 text-ink' : 'border-line text-ink-soft hover:border-line-strong hover:text-ink'
  }`

/**
 * Sign in and Create account share one page with two tabs (wireframe: Access), so a new
 * requester never hunts for a separate sign-up link (REQ-023).
 */
export default function AuthPage({ mode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  // Signed in (just now, or already): go back to the page that asked for sign-in, else the role's home.
  if (isAuthenticated) return <Navigate to={location.state?.from?.pathname ?? homeFor(user.role)} replace />
  const registering = mode === 'register'

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_27rem] lg:gap-16">
      <section className="max-w-xl lg:pt-6">
        <h1 className="text-4xl font-semibold text-ink sm:text-5xl">Report a problem once. See where it stands.</h1>
        <p className="mt-5 text-lg text-ink-soft">
          One record for every facility fault, repair, IT problem and security concern, from the day it is reported to
          the day it is closed.
        </p>
        <dl className="mt-8 flex flex-col gap-4 border-l-2 border-civic-300 pl-5">
          {[
            ['Requesters', 'Report a problem in about a minute and follow every update.'],
            ['Staff', 'Work one list for your team: accept, update, complete.'],
            ['Management', 'See what is open, what is overdue and who did what.'],
          ].map(([term, text]) => (
            <div key={term}>
              <dt className="font-semibold">{term}</dt>
              <dd className="text-ink-soft">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-raised p-6 shadow-card sm:p-8">
        <nav aria-label="Account" className="mb-6 flex">
          <Link to="/sign-in" className={tabClass(!registering)} aria-current={!registering ? 'page' : undefined}>
            Sign in
          </Link>
          <Link to="/register" className={tabClass(registering)} aria-current={registering ? 'page' : undefined}>
            Create account
          </Link>
        </nav>
        {registering ? <RegisterForm /> : <SignInForm />}
      </section>
    </div>
  )
}

function SignInForm() {
  const { signIn, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)

  const update = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const result = validate(form, signInSchema)
    setErrors(result.errors)
    setFailure(null)
    if (!result.valid) return
    setBusy(true)
    try {
      await signIn(form) // AuthPage redirects as soon as the session exists
    } catch (error) {
      setFailure(error)
      setBusy(false)
    }
  }

  const resend = async () => {
    setResending(true)
    try {
      const response = await authGateway.resendVerification(form.email)
      navigate('/check-email', { state: { email: form.email, demoToken: response?.demo_verification_token, resent: true } })
    } catch (error) {
      setFailure(error)
      setResending(false)
    }
  }

  const unverified = failure?.code === ERROR_CODE.EMAIL_NOT_VERIFIED

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h2 className="sr-only">Sign in</h2>
      {sessionExpired && !failure && <Banner tone="warning" title="Your session ended">Sign in again to continue.</Banner>}
      {location.state?.verified && !failure && <Banner tone="success" title="Email confirmed">Sign in with your email and password.</Banner>}
      {unverified && (
        <Banner tone="error" title="Please confirm your email first">
          We sent a link to {form.email} when you registered.{' '}
          <button type="button" onClick={resend} disabled={resending} className="link cursor-pointer">
            {resending ? 'Sending…' : 'Send a new confirmation email'}
          </button>
        </Banner>
      )}
      {failure && !unverified && <Banner tone="error" title={failure.message} />}

      <Field id="email" label="Email address" required error={errors.email}>
        {(a11y) => <input {...a11y} name="email" type="email" autoComplete="email" value={form.email} onChange={update} className="input" />}
      </Field>
      <Field id="password" label="Password" required error={errors.password}>
        {(a11y) => <PasswordInput {...a11y} name="password" autoComplete="current-password" value={form.password} onChange={update} />}
      </Field>
      <Button type="submit" busy={busy} busyLabel="Signing in…" className="w-full">
        Sign in
      </Button>
      <p className="text-sm text-ink-soft">
        After sign-in you see only the pages your role allows: requesters their own requests, staff their team's
        worklist, management the oversight dashboard.
      </p>

      {isDemoMode && (
        <div className="rounded-md border border-signal-400 bg-signal-100/60 p-4">
          <p className="font-semibold">Demo accounts</p>
          <p className="text-sm text-ink-soft">Choose one to fill in the form, then sign in.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => setForm({ email: account.email, password: DEMO_PASSWORD })}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-line-strong bg-raised px-3 py-2 text-left hover:border-ink"
                >
                  <span className="font-medium">{account.name}</span>
                  <span className="text-sm text-ink-soft">{account.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)

  const update = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const result = validate(form, registerSchema)
    setErrors(result.errors)
    setFailure(null)
    if (!result.valid) return
    setBusy(true)
    try {
      const response = await authGateway.register(form)
      // Same page for every address, registered or not, so the form cannot reveal who has an account (D13).
      navigate('/check-email', { state: { email: form.email.trim().toLowerCase(), demoToken: response?.demo_verification_token } })
    } catch (error) {
      setFailure(error)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h2 className="sr-only">Create account</h2>
      {failure && <Banner tone="error" title={failure.message} />}
      <Field id="name" label="Full name" required error={errors.name}>
        {(a11y) => <input {...a11y} name="name" autoComplete="name" value={form.name} onChange={update} className="input" />}
      </Field>
      <Field id="email" label="Email address" required error={errors.email} hint="We will send a confirmation link to this address.">
        {(a11y) => <input {...a11y} name="email" type="email" autoComplete="email" value={form.email} onChange={update} className="input" />}
      </Field>
      <Field id="password" label="Password" required error={errors.password} hint={`At least ${PASSWORD_MIN} characters.`}>
        {(a11y) => <PasswordInput {...a11y} name="password" autoComplete="new-password" value={form.password} onChange={update} />}
      </Field>
      <Field id="confirmPassword" label="Confirm password" required error={errors.confirmPassword}>
        {(a11y) => <PasswordInput {...a11y} name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={update} />}
      </Field>
      <Button type="submit" busy={busy} busyLabel="Creating account…" className="w-full">
        Create account
      </Button>
      <p className="text-sm text-ink-soft">Staff and management accounts are created by the administrator.</p>
    </form>
  )
}
