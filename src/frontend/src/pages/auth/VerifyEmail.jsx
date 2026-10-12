import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authGateway } from '../../services'
import Banner from '../../components/common/Banner'
import Button from '../../components/common/Button'
import PageHeader from '../../components/common/PageHeader'

/**
 * Landing page of the emailed link. The token is only used when the person presses the button
 * (a POST), so automatic mail scanners that open links cannot use it up (D13, OWASP).
 */
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await authGateway.verifyEmail(token)
      navigate('/sign-in', { replace: true, state: { verified: true } })
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-5">
      <PageHeader title="Confirm your email" />
      {!token && (
        <Banner tone="error" title="This link is incomplete">
          Open the link from your confirmation email again, or copy the whole address into the browser.
        </Banner>
      )}
      {error && (
        <Banner tone="error" title="This link can no longer be used">
          {error.message} Sign in with your email and password to be offered a new link.
        </Banner>
      )}
      {token && !error && <p className="text-lg text-ink-soft">Press the button to activate your CivicConnect account.</p>}
      <div className="flex flex-wrap gap-3">
        {token && !error && (
          <Button onClick={confirm} busy={busy} busyLabel="Confirming…">
            Confirm my email
          </Button>
        )}
        <Button as={Link} to="/sign-in" variant="secondary">
          Go to sign in
        </Button>
      </div>
    </div>
  )
}
