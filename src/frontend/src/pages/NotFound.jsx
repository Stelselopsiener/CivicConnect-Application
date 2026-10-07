import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { homeFor } from '../domain/navigation'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'

export default function NotFound() {
  const { user } = useAuth()
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-4">
      <PageHeader title="This page does not exist" />
      <p className="text-lg text-ink-soft">The address may be mistyped, or the page may have moved.</p>
      <Button as={Link} to={homeFor(user?.role)} className="self-start">
        {user ? 'Back to your home page' : 'Go to sign in'}
      </Button>
    </div>
  )
}
