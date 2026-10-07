import { useCallback, useEffect, useRef, useState } from 'react'
import { useEventBus } from './useEventBus'

const NO_EVENTS = []

/**
 * Runs a gateway call and exposes { data, error, isLoading, reload }.
 *
 * - `deps` decides when to run again, like useEffect.
 * - `refreshOn` lists events (Observer) that should silently reload the data, so a list
 *   updates itself after a command elsewhere on the page without a full spinner.
 * - A stale response (the user changed filters while a call was in flight) is ignored.
 */
export function useAsync(asyncFn, deps = [], { refreshOn = NO_EVENTS } = {}) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true })
  const callId = useRef(0)
  const fn = useRef(asyncFn)
  useEffect(() => {
    fn.current = asyncFn
  })

  const run = useCallback((silent = false) => {
    const id = ++callId.current
    if (!silent) setState((previous) => ({ ...previous, isLoading: true, error: null }))
    return fn.current().then(
      (data) => {
        if (id === callId.current) setState({ data, error: null, isLoading: false })
      },
      (error) => {
        if (id === callId.current) setState({ data: null, error, isLoading: false })
      },
    )
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEventBus(refreshOn, () => run(true))

  return { ...state, reload: run, setData: (data) => setState({ data, error: null, isLoading: false }) }
}
