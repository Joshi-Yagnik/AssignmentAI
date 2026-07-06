import { Outlet } from 'react-router-dom';
import Sidebar from '../shared/Sidebar';
import { useAuth } from '../../context/AuthContext';

/**
 * PortalLayout — wraps all authenticated portal pages.
 * Reads the logged-in user from AuthContext (no more mock data).
 * @param {'student'|'teacher'|'admin'} role - used to find the correct sidebar nav
 */
export default function PortalLayout({ role }) {
  const { user } = useAuth();

  // Fallback user shape in case the context is briefly null
  const safeUser = user ?? { name: '…', role, avatar: '?' };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar user={safeUser} />
      {/* Main — offset by sidebar width on desktop */}
      <div className="flex-1 flex flex-col md:ml-60 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
