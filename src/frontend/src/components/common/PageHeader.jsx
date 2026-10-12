import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/** Breadcrumb + page title + page-level actions. `title` receives the single <h1>. */
export default function PageHeader({ crumbs = [], title, documentTitle, meta, actions, children }) {
  const tabTitle = documentTitle ?? (typeof title === 'string' ? title : null)
  useEffect(() => {
    if (tabTitle) document.title = `${tabTitle} | CivicConnect`
  }, [tabTitle])

  return (
    <header className="flex flex-col gap-3">
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
          <ol className="flex flex-wrap items-center gap-x-2">
            {crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-x-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {crumb.to ? (
                  <Link to={crumb.to} className="link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="tabular">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold text-ink sm:text-[2rem]">{title}</h1>
          {meta && <div className="mt-1.5 text-ink-soft">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
