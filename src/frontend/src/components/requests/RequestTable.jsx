import { Link } from 'react-router-dom'
import { daysOverdue } from '../../domain/requestRules'
import { formatDate, formatRecent } from '../../utils/format'
import Icon from '../common/Icon'
import StatusPill, { OverduePill } from './StatusPill'

const Reference = ({ request }) => <span className="tabular font-mono text-sm font-medium text-ink-soft">{request.reference}</span>

const Due = ({ request }) => (
  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
    <span className="tabular whitespace-nowrap">{formatDate(request.targetDate)}</span>
    {request.isOverdue && <OverduePill days={daysOverdue(request)} />}
  </span>
)

/** Every column a request list can show. Screens choose columns by key; `sort` names a strategy. */
const COLUMNS = {
  reference: { header: 'Reference', sort: 'reference', cell: (r) => <Reference request={r} /> },
  title: { header: 'Title', sort: 'title', primary: true },
  category: { header: 'Category', sort: 'category', cell: (r) => r.category },
  address: { header: 'Street address', cell: (r) => r.streetAddress },
  status: { header: 'Status', sort: 'status', cell: (r) => <StatusPill status={r.status} /> },
  owner: { header: 'Owner', cell: (r) => r.owner?.name ?? <span className="text-ink-soft">Unassigned</span> },
  due: { header: 'Due', sort: 'dueSoonest', cell: (r) => <Due request={r} /> },
  lastUpdate: { header: 'Last update', sort: 'lastUpdate', cell: (r) => <span className="tabular whitespace-nowrap">{formatRecent(r.lastUpdate)}</span> },
}

function SortHeader({ column, sort, onSort }) {
  if (!column.sort || !onSort) return column.header
  const active = sort?.key === column.sort
  return (
    <button type="button" onClick={() => onSort(column.sort)} className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 font-semibold hover:text-civic-600">
      {column.header}
      <Icon name={active ? (sort.direction === 'desc' ? 'up' : 'down') : 'sort'} size={14} className={active ? 'text-civic-600' : 'text-line-strong'} />
    </button>
  )
}

/**
 * Request list: a sortable table from tablet width up, stacked cards on phones (WCAG 1.4.10,
 * REQ-032). The title is a real link stretched over the whole row, so the row is one large
 * target for mouse and touch and one focus stop for the keyboard (WCAG 2.1.1).
 */
export default function RequestTable({ requests, columns, sort, onSort, caption }) {
  const visible = columns.map((key) => ({ key, ...COLUMNS[key] }))
  const linkTo = (request) => `/requests/${request.id}`

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-raised shadow-card md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b-2 border-ink/80 text-sm">
              {visible.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-3 font-semibold"
                  aria-sort={sort?.key === column.sort ? (sort.direction === 'desc' ? 'descending' : 'ascending') : undefined}
                >
                  <SortHeader column={column} sort={sort} onSort={onSort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className={`relative border-b border-line last:border-0 hover:bg-civic-50/60 ${request.isOverdue ? 'shadow-[inset_3px_0_0_var(--color-brick-500)]' : ''}`}>
                {visible.map((column) => (
                  <td key={column.key} className="px-4 py-3.5 align-middle">
                    {column.primary ? (
                      <Link to={linkTo(request)} className="font-semibold text-ink after:absolute after:inset-0 hover:underline">
                        {request.title}
                      </Link>
                    ) : (
                      column.cell(request)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {requests.map((request) => (
          <li key={request.id} className={`relative rounded-lg border bg-raised p-4 shadow-card ${request.isOverdue ? 'border-brick-500' : 'border-line'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Reference request={request} />
              <span className="flex flex-wrap items-center gap-1.5">
                {request.isOverdue && <OverduePill days={daysOverdue(request)} />}
                <StatusPill status={request.status} />
              </span>
            </div>
            <Link to={linkTo(request)} className="mt-2 block font-semibold after:absolute after:inset-0">
              {request.title}
            </Link>
            <p className="mt-1 text-sm text-ink-soft">
              {columns.includes('address') ? request.streetAddress : request.category}
              {columns.includes('due') ? `, due ${formatDate(request.targetDate)}` : `, updated ${formatRecent(request.lastUpdate)}`}
            </p>
            {columns.includes('owner') && <p className="text-sm text-ink-soft">{request.owner ? `Owner: ${request.owner.name}` : 'Unassigned'}</p>}
          </li>
        ))}
      </ul>
    </>
  )
}
