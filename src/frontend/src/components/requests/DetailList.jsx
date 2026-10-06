/** Label / value pairs for a request. Rows are [label, value]; empty values are skipped. */
export default function DetailList({ rows }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[9rem_1fr]">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="-mt-2 min-w-0 break-words sm:mt-0">{value}</dd>
          </div>
        ))}
    </dl>
  )
}
