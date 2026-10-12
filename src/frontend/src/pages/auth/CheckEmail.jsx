import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { authGateway, isDemoMode } from '../../services'
import Banner, { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Icon from '../../components/common/Icon'
import PageHeader from '../../components/common/PageHeader'

/** Shown after registration and after "resend" (wireframe: Confirm your email, D13 / CR-004). */
export default function CheckEmail() {
  const { state } = useLocation()
  const [demoToken, setDemoToken] = useState(state?.demoToken ?? null)
  const [resent, setResent] = useState(Boolean(state?.resent))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!state?.email) return <Navigate to="/register" replace />

  const resend = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await authGateway.resendVerification(state.email)
      setDemoToken(response?.demo_verification_token ?? null)
      setResent(true)
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div className="flex max-w-lg flex-col gap-5">
        <PageHeader title="Check your email" />
        <Banner tone="info">
          We sent a confirmation link to <strong>{state.email}</strong>. Open it to activate your account. The link
          works once and expires in 24 hours.
        </Banner>
        {resent && <Banner tone="success">A new link is on its way. The earlier link no longer works.</Banner>}
        <ErrorBanner error={error} />
        <p className="text-ink-soft">
          No email after a few minutes? Check your spam folder, or{' '}
          <button type="button" onClick={resend} disabled={busy} className="link cursor-pointer">
            {busy ? 'sending…' : 'send a new confirmation email'}
          </button>
          .
        </p>
        <Button as={Link} to="/sign-in" state={{ email: state.email }} variant="secondary" className="self-start">
          Go to sign in
        </Button>
      </div>

      {isDemoMode && demoToken && (
        <aside className="rounded-lg border border-dashed border-line-strong bg-sunken/60 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="mail" /> Demo inbox
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            No email is sent in demo mode. This is the message the real system would deliver.
          </p>
          <div className="mt-4 rounded-md border border-line bg-raised p-5 shadow-card">
            <p className="text-sm text-ink-soft">From CivicConnect. Subject: Confirm your CivicConnect account</p>
            <p className="mt-3">Please confirm this is your email address to activate your CivicConnect account.</p>
            <Button as={Link} to={`/verify-email?token=${demoToken}`} size="sm" className="mt-4">
              Confirm my email
            </Button>
            <p className="mt-4 text-sm text-ink-soft">
              This link expires in 24 hours. If you did not create an account, ignore this email.
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
