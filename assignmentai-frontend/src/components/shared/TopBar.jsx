import { Bell, Search, Menu } from 'lucide-react';

/**
 * TopBar — page header with title, subtitle, breadcrumb, and actions.
 * Mobile: compact layout with just hamburger + truncated title + bell icon.
 * Desktop: full layout with subtitle, search, and action buttons.
 *
 * @param {string}    title
 * @param {string}    [subtitle]
 * @param {string[]}  [breadcrumb]
 * @param {ReactNode} [actions]    - right-side CTA buttons
 * @param {boolean}   [showSearch]
 */
export default function TopBar({ title, subtitle, breadcrumb, actions, showSearch = false }) {
  const openSidebar = () => {
    window.dispatchEvent(new CustomEvent('aaai:open-sidebar'));
  };

  return (
    <header className="h-14 md:h-16 px-3 md:px-6 flex items-center justify-between gap-2 md:gap-4
                        bg-white border-b border-border sticky top-0 z-20">

      {/* Left — mobile menu toggle + title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        {/* Hamburger — only visible on mobile alongside sidebar toggle */}
        <button
          className="md:hidden btn-icon shrink-0 -ml-1"
          onClick={openSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          {breadcrumb && (
            <nav className="hidden sm:flex items-center gap-1.5 text-label-sm text-ink-muted mb-0.5">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border">›</span>}
                  <span className={i === breadcrumb.length - 1 ? 'text-ink-primary font-medium' : ''}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-base md:text-headline-sm text-ink-primary font-semibold truncate leading-tight">
            {title}
          </h1>
          {subtitle && !breadcrumb && (
            <p className="hidden sm:block text-label-md text-ink-muted truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right — search + actions */}
      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        {showSearch && (
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
            <input
              className="input pl-9 py-2 w-52 text-sm"
              placeholder="Search…"
              aria-label="Search dashboard"
            />
          </div>
        )}

        {/* Notification bell */}
        <button
          className="btn-icon relative"
          aria-label="View Notifications"
          onClick={() => window.dispatchEvent(new CustomEvent('aaai:toggle-notifications'))}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Actions — hidden on very small screens if too many */}
        {actions && (
          <div className="hidden xs:flex items-center gap-2 sm:flex">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
