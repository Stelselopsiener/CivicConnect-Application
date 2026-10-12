const PATHS = {
  check: 'M4 10.5l4 4 8-9',
  alert: 'M10 6v5m0 3v.01M10 2.5l8 14.5H2z',
  info: 'M10 9v5m0-8v.01M10 18a8 8 0 100-16 8 8 0 000 16z',
  bell: 'M5 8a5 5 0 0110 0c0 4 1.5 5 1.5 5h-13S5 12 5 8zm3.5 8a1.5 1.5 0 003 0',
  menu: 'M3 6h14M3 10h14M3 14h14',
  close: 'M5 5l10 10M15 5L5 15',
  plus: 'M10 4v12M4 10h12',
  up: 'M10 15V5m0 0l-4 4m4-4l4 4',
  down: 'M10 5v10m0 0l-4-4m4 4l4-4',
  sort: 'M7 4v12m0 0l-3-3m3 3l3-3M13 16V4m0 0l-3 3m3-3l3 3',
  chevron: 'M8 5l5 5-5 5',
  mail: 'M3 5h14v10H3zm0 1l7 5 7-5',
  clock: 'M10 6v4l3 2m5-2a8 8 0 11-16 0 8 8 0 0116 0z',
  lock: 'M6 9V7a4 4 0 018 0v2m-9 0h10v8H5z',
}

/** Decorative by default; pass `label` when the icon is the only content of a control. */
export default function Icon({ name, size = 18, label, className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
