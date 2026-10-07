import { useCallback, useState } from 'react'

/** Remembers which sort strategy a table uses; choosing the active column again flips direction. */
export function useSort(initialKey, initialDirection = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, direction: initialDirection })
  const onSort = useCallback(
    (key) =>
      setSort((current) =>
        current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
      ),
    [],
  )
  return { sort, onSort, setSort }
}
