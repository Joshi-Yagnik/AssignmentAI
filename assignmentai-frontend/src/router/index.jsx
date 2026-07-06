import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '../components/shared/Toast';
import PortalLayout from '../components/layouts/PortalLayout';
import { useAuth } from '../context/AuthContext';

// Auth
import LoginPage from '../pages/auth/LoginPage';

// Student
import StudentDashboard from '../pages/student/StudentDashboard';
import VivaExamPage     from '../pages/student/VivaExamPage';

// Teacher
import TeacherDashboard    from '../pages/teacher/TeacherDashboard';
import DeployAssignmentPage from '../pages/teacher/DeployAssignmentPage';
import StudentRequestsPage  from '../pages/teacher/StudentRequestsPage';
import ReviewWorkPage       from '../pages/teacher/ReviewWorkPage';

// Admin
import AdminDashboard from '../pages/admin/AdminDashboard';

// ── Placeholder ───────────────────────────────────────────────────────────────
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center flex-1 p-12 text-ink-muted">
    <p className="text-headline-sm text-ink-primary mb-2">{title}</p>
    <p>This page is coming soon.</p>
  </div>
);

// ── Role → default portal path ────────────────────────────────────────────────
const ROLE_HOME = { student: '/student', teacher: '/teacher', admin: '/admin' };

// ── Full-screen auth-check spinner ────────────────────────────────────────────
function AuthSpinner() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-ink-muted text-label-md">Verifying session…</p>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute — blocks access if not authenticated or wrong role.
 * @param {string[]} allowedRoles - roles that can access this route
 * @param {React.ReactNode} children
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <AuthSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their correct portal
    return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
  }

  return children;
}

/**
 * RootRedirect — from "/" redirect based on auth state.
 */
function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <AuthSpinner />;
  if (isAuthenticated && role) return <Navigate to={ROLE_HOME[role]} replace />;
  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* ── Student Portal ─────────────────────────────────────────── */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <PortalLayout role="student" />
              </ProtectedRoute>
            }
          >
            <Route index              element={<StudentDashboard />} />
            <Route path="assignments" element={<Placeholder title="My Assignments" />} />
            <Route path="ai-grading"  element={<Placeholder title="AI Grading" />} />
            <Route path="viva"        element={<VivaExamPage />} />
            <Route path="grades"      element={<Placeholder title="Grades & Reports" />} />
          </Route>

          {/* ── Teacher Portal ─────────────────────────────────────────── */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <PortalLayout role="teacher" />
              </ProtectedRoute>
            }
          >
            <Route index              element={<TeacherDashboard />} />
            <Route path="assignments" element={<DeployAssignmentPage />} />
            <Route path="grading"     element={<Placeholder title="AI Grading Queue" />} />
            <Route path="viva"        element={<Placeholder title="Live Viva Sessions" />} />
            <Route path="students"    element={<Placeholder title="Students" />} />
            <Route path="requests"    element={<StudentRequestsPage />} />
            <Route path="analytics"   element={<Placeholder title="Analytics" />} />
            <Route path="review/:submissionId" element={<ReviewWorkPage />} />
          </Route>

          {/* ── Admin Portal ───────────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PortalLayout role="admin" />
              </ProtectedRoute>
            }
          >
            <Route index              element={<AdminDashboard />} />
            <Route path="users"       element={<Placeholder title="Users & Roles" />} />
            <Route path="courses"     element={<Placeholder title="Courses & Assignments" />} />
            <Route path="ai-engine"   element={<Placeholder title="AI Engine" />} />
            <Route path="viva"        element={<Placeholder title="Viva Control" />} />
            <Route path="reports"     element={<Placeholder title="Reports & Analytics" />} />
            <Route path="security"    element={<Placeholder title="Security" />} />
            <Route path="settings"    element={<Placeholder title="Settings" />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
