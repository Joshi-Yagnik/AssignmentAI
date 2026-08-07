import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Bot, Video,
  BarChart3, Users, Settings, Inbox, FileText, UserCircle,
  Building2, ShieldCheck, Library
} from 'lucide-react';

/**
 * BottomNav — mobile-only fixed bottom navigation bar.
 * Shows the top 4–5 nav items for the current role as icon + label tabs.
 * Only visible on screens < md (768px). Hidden on desktop.
 */

// Top items to show in bottom nav per role (max 5)
const BOTTOM_NAV = {
  student: [
    { label: 'Home',        to: '/student',            icon: LayoutDashboard },
    { label: 'Assignments', to: '/student/assignments', icon: ClipboardList   },
    { label: 'Grades',      to: '/student/grades',      icon: BarChart3       },
    { label: 'Viva',        to: '/student/viva',        icon: Video           },
    { label: 'Profile',     to: '/student/profile',     icon: UserCircle      },
  ],
  teacher: [
    { label: 'Home',        to: '/teacher',             icon: LayoutDashboard },
    { label: 'Assignments', to: '/teacher/assignments', icon: ClipboardList   },
    { label: 'Grading',     to: '/teacher/grading',     icon: Bot             },
    { label: 'Viva',        to: '/teacher/viva',        icon: Video           },
    { label: 'Students',    to: '/teacher/students',    icon: Users           },
  ],
  admin: [
    { label: 'Overview',    to: '/admin',               icon: LayoutDashboard },
    { label: 'Users',       to: '/admin/users',         icon: Users           },
    { label: 'Courses',     to: '/admin/courses',       icon: Library         },
    { label: 'Reports',     to: '/admin/reports',       icon: BarChart3       },
    { label: 'Settings',    to: '/admin/settings',      icon: Settings        },
  ],
  ta: [
    { label: 'Home',        to: '/ta',                  icon: LayoutDashboard },
    { label: 'Sessions',    to: '/ta',                  icon: Video           },
    { label: 'Profile',     to: '/ta/profile',          icon: UserCircle      },
  ],
};

export default function BottomNav({ role }) {
  const items = BOTTOM_NAV[role] ?? [];

  return (
    <nav className="bottom-nav" aria-label="Mobile bottom navigation">
      {items.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={`${to}-${label}`}
          to={to}
          end={to === `/${role}` || to === '/admin'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
          aria-label={label}
        >
          <Icon className="nav-icon" aria-hidden="true" />
          <span className="truncate max-w-full text-center leading-none">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
