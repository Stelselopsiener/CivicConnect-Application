import { Link } from 'react-router-dom'
import Button from '../components/common/Button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-semibold text-ink">Page not found</h1>
      <p className="text-ink-soft">The page you're looking for doesn't exist or has moved.</p>
      <Button as={Link} to="/" variant="secondary" className="mt-2">
        Back home
      </Button>
    </div>
  )
}
