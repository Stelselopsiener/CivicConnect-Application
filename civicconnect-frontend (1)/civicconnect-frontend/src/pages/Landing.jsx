import { Link } from 'react-router-dom'
import Button from '../components/common/Button'

export default function Landing() {
  return (
    <div className="w-full max-w-2xl text-center">
      <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        Report it once. Track it through.
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-ink-soft">
        CivicConnect lets residents report local issues — potholes, broken streetlights,
        water outages — and follow them from report to resolution, with municipal staff
        working the same queue.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button as={Link} to="/register" variant="primary">
          Create an account
        </Button>
        <Button as={Link} to="/login" variant="secondary">
          Log in
        </Button>
      </div>
    </div>
  )
}
