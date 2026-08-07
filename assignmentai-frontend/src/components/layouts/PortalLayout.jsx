import { Outlet } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import BottomNav from '../shared/BottomNav';
import { useAuth } from '../../context/AuthContext';

/**
 * PortalLayout — wraps all authenticated portal pages.
 * - Desktop: fixed sidebar (240px) on the left, content offset by md:ml-60
 * - Mobile: off-canvas slide-in sidebar + fixed bottom navigation bar
 *
 * @param {'student'|'teacher'|'admin'|'ta'} role - used to find the correct sidebar nav
 */
export default function PortalLayout({ role }) {
  const { user } = useAuth();

  // Fallback user shape in case the context is briefly null
  const safeUser = user ?? { name: '…', role, avatar: '?' };

  return (
    <div className="flex min-h-screen min-h-dvh bg-surface">
      {/* Sidebar — fixed on desktop, off-canvas on mobile */}
      <Sidebar user={safeUser} />

      {/* Main content area
          - md:ml-60  → offset for desktop sidebar
          - pb-20 md:pb-0 → bottom padding on mobile for bottom nav bar (64px + safe area)
      */}
      <div className="flex-1 flex flex-col md:ml-60 min-h-screen min-h-dvh pb-20 md:pb-0">
        <Outlet />
      </div>

      {/* Bottom navigation — mobile only (hidden on md+) */}
      <BottomNav role={safeUser.role} />
    </div>
  );
}
