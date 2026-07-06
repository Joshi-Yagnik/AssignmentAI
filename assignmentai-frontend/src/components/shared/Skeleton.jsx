// ── Skeleton Components ───────────────────────────────────────────────────────

function Base({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-surface-high rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

/** Full stat card skeleton */
export function SkeletonStat() {
  return (
    <div className="card flex items-center gap-4" aria-hidden="true">
      <Base className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Base className="h-7 w-16" />
        <Base className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Single table row skeleton */
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <Base className={`h-4 ${i === 0 ? 'w-32' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

/** Multiple table rows */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

/** Text line skeleton */
export function SkeletonText({ width = 'w-40', height = 'h-4' }) {
  return <Base className={`${width} ${height}`} />;
}

/** Card body skeleton */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card flex flex-col gap-3" aria-hidden="true">
      <Base className="h-5 w-32" />
      {Array.from({ length: lines }, (_, i) => (
        <Base key={i} className={`h-4 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** Course / viva card skeleton */
export function SkeletonListItem() {
  return (
    <div className="card-hover flex items-center gap-5 py-4" aria-hidden="true">
      <Base className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Base className="h-4 w-48" />
        <Base className="h-3 w-32" />
        <Base className="h-2 w-full" />
      </div>
      <Base className="w-20 h-8 rounded-lg shrink-0" />
    </div>
  );
}
