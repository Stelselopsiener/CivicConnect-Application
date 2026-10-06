export default function Card({ title, aside, as: Heading = 'h2', className = '', children }) {
  return (
    <section className={`rounded-lg border border-line bg-raised p-5 shadow-card sm:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && <Heading className="text-lg font-semibold text-ink">{title}</Heading>}
          {aside && <div className="text-sm text-ink-soft">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
