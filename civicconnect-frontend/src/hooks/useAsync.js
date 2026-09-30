import { useCallback, useEffect, useState } from 'react'

/**
 * Small helper to run an async service call with loading/error/data state.
 * Keeps pages free of repeated try/catch/loading boilerplate.
 */
export function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const run = useCallback(() => {
    setIsLoading(true)
    setError('')
    asyncFn()
      .then((result) => setData(result))
      .catch((err) => setError(err.message || 'Something went wrong.'))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, error, isLoading, refetch: run }
}
