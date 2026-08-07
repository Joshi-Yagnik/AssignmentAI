import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

/**
 * DataTable — sortable, paginated, searchable table.
 * On mobile (< md): renders each row as a card using mobile-card-row CSS class.
 * On desktop: renders a full data table.
 *
 * @param {Array}  columns       - [{ key, label, render?, sortable?, width?, mobileHide? }]
 * @param {Array}  data          - array of row objects
 * @param {string} [emptyMsg]
 * @param {number} [pageSize]
 * @param {boolean}[searchable]
 * @param {string[]}[searchKeys]
 * @param {string} [mobilePrimaryKey]  - column key to use as card title on mobile
 * @param {string} [mobileSubKey]      - column key to use as card subtitle on mobile
 */
export default function DataTable({
  columns,
  data,
  emptyMsg = 'No records found.',
  pageSize = 10,
  searchable = false,
  searchKeys = [],
  mobilePrimaryKey = null,
  mobileSubKey = null,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);
  const [query, setQuery]     = useState('');

  // Filter
  const filtered = searchable && query.trim()
    ? data.filter(row =>
        searchKeys.some(k =>
          String(row[k] ?? '').toLowerCase().includes(query.toLowerCase())
        )
      )
    : data;

  // Sort
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = a[sortKey] ?? '';
        const vb = b[sortKey] ?? '';
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  // Determine primary column for mobile (first column if not specified)
  const primaryCol = mobilePrimaryKey
    ? columns.find(c => c.key === mobilePrimaryKey) || columns[0]
    : columns[0];
  const subCol = mobileSubKey
    ? columns.find(c => c.key === mobileSubKey)
    : null;
  // Columns shown as fields in mobile cards (exclude primary, sub, and mobileHide)
  const mobileFieldCols = columns.filter(
    c => c.key !== primaryCol?.key && c.key !== subCol?.key && !c.mobileHide
  );

  // ── Pagination controls ────────────────────────────────────────────────
  const PaginationControls = () => totalPages <= 1 ? null : (
    <div className="flex items-center justify-between text-label-md text-ink-secondary flex-wrap gap-2">
      <span className="text-xs text-ink-muted">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="btn-icon disabled:opacity-30"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          // Smart pagination: show pages around current
          let n;
          if (totalPages <= 5) {
            n = i + 1;
          } else if (page <= 3) {
            n = i + 1;
          } else if (page >= totalPages - 2) {
            n = totalPages - 4 + i;
          } else {
            n = page - 2 + i;
          }
          return (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 rounded-lg text-label-md font-medium transition-colors
                ${n === page
                  ? 'bg-primary text-white'
                  : 'text-ink-secondary hover:bg-surface-container'}`}
            >
              {n}
            </button>
          );
        })}
        <button
          className="btn-icon disabled:opacity-30"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            className="input pl-9 py-2 text-sm"
            placeholder="Search…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
      )}

      {/* ── Mobile: Card list ──────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-3">
        {paginated.length === 0 ? (
          <div className="text-center py-12 text-ink-muted text-sm">{emptyMsg}</div>
        ) : (
          paginated.map((row, i) => (
            <div key={row.id ?? i} className="mobile-card-row">
              {/* Card header: primary + last action column */}
              <div className="mobile-card-row-header">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-primary text-sm leading-snug">
                    {primaryCol?.render
                      ? primaryCol.render(row[primaryCol.key], row)
                      : String(row[primaryCol?.key] ?? '—')}
                  </div>
                  {subCol && (
                    <div className="text-label-sm text-ink-muted mt-0.5">
                      {subCol.render
                        ? subCol.render(row[subCol.key], row)
                        : String(row[subCol.key] ?? '')}
                    </div>
                  )}
                </div>
                {/* Last column (usually action/status) */}
                {columns[columns.length - 1]?.key !== primaryCol?.key && (
                  <div className="shrink-0">
                    {(() => {
                      const lastCol = columns[columns.length - 1];
                      return lastCol.render
                        ? lastCol.render(row[lastCol.key], row)
                        : String(row[lastCol.key] ?? '');
                    })()}
                  </div>
                )}
              </div>

              {/* Card fields: remaining columns */}
              {mobileFieldCols
                .filter(c => c.key !== columns[columns.length - 1]?.key)
                .map(col => (
                  <div key={col.key} className="mobile-card-row-field">
                    <span className="mobile-card-row-label">{col.label}</span>
                    <span className="mobile-card-row-value">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: Table ─────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : {}}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-surface-container' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-ink-muted">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={row.id ?? i} className="animate-fade-in">
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls />
    </div>
  );
}
