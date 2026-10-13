import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { authGateway } from '../../services'
import Banner, { ErrorBanner } from '../../components/common/Banner'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'

export default function CheckEmail() {
  const { state } = useLocation()
  const [resent, setResent] = useState(Boolean(state?.resent))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  if (!state?.email) return <Navigate to="/register" replace />
  const resend = async () => {
    setBusy(true)
    setError(null)
    try {
      await authGateway.resendVerification(state.email)
      setResent(true)
    } catch (failure) { setError(failure) }
    finally { setBusy(false) }
  }
  return (
    <div className="flex max-w-lg flex-col gap-5">
      <PageHeader title="Check your email" />
      <Banner tone="info">
        If <strong>{state.email}</strong> is eligible, check its inbox for your six-digit code.
        Enter the code to activate your account. Codes expire after 10 minutes and work once.
      </Banner>
      {resent && <Banner tone="success">Request received. If a new code is issued, it replaces the previous code.</Banner>}
      <ErrorBanner error={error} />
      <Button as={Link} to="/verify-email" state={{ email: state.email }} className="self-start">Enter verification code</Button>
      <p className="text-ink-soft">No email? Check spam. Wait at least 60 seconds between requests, then{' '}
        <button type="button" onClick={resend} disabled={busy} className="link cursor-pointer">
          {busy ? 'requesting…' : 'request a new code'}
        </button>. If the account is already verified, sign in.
      </p>
      <Button as={Link} to="/sign-in" state={{ email: state.email }} variant="secondary" className="self-start">Go to sign in</Button>

    </div>
  )
}
