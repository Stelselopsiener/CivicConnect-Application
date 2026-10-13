import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authGateway } from '../../services'
import Banner from '../../components/common/Banner'
import Button from '../../components/common/Button'
import Field from '../../components/common/Field'
import PageHeader from '../../components/common/PageHeader'

export default function VerifyEmail() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const email = state?.email?.trim().toLowerCase() ?? ''
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const confirm = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await authGateway.verifyEmail(email, code)

      navigate('/sign-in', {
        replace: true,
        state: { verified: true, email },
      })
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  if (!email) {
    return <Navigate to="/sign-in" replace />
  }

  return (
    <form onSubmit={confirm} className="flex max-w-lg flex-col gap-5">
      <PageHeader title="Confirm your email" />

      <p className="text-ink-soft">
        Enter the latest six-digit code from your email.
        It expires after 10 minutes.
      </p>

      <p className="text-ink-soft">
        Confirming the email address: <strong>{email}</strong>
      </p>

      {error && (
        <Banner tone="error">{error.message}</Banner>
      )}

      <Field
        id="verification-code"
        label="Six-digit code"
        required
      >
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className="input"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value.replace(/\D/g, '').slice(0, 6)
              )
            }
          />
        )}
      </Field>

      <Button
        type="submit"
        busy={busy}
        busyLabel="Confirming…"
      >
        Confirm my email
      </Button>

      <Link
        className="link"
        to="/check-email"
        state={{ email }}
      >
        Request another code
      </Link>

      <Link
        className="link"
        to="/sign-in"
        state={{ email }}
      >
        Go to sign in
      </Link>
    </form>
  )
}