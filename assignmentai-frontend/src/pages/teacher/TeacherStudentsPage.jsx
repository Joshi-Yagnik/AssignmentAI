import { useState, useEffect } from 'react';
import TopBar from '../../components/shared/TopBar';
import api from '../../services/api';
import { Search, Mail, Filter, ShieldAlert, CheckCircle2, ChevronRight, UserCircle } from 'lucide-react';

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real system, we'd fetch only students enrolled in this teacher's classes.
  // For now, we'll fetch all students to mock the view.
  useEffect(() => {
    api.get('/admin/users') // Reusing the admin endpoint for demo purposes to get users
      .then(({ data }) => {
        // Filter out only students
        const onlyStudents = (data || []).filter(u => u.role === 'student');
        setStudents(onlyStudents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar title="My Students" subtitle="Monitor academic performance and security flags for your enrolled students." />
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input type="text" placeholder="Search by name or email..." className="input pl-9 h-10 w-full bg-surface" />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm flex items-center gap-2 bg-surface">
              <Filter className="w-4 h-4" /> Filter Class
            </button>
            <button className="btn-secondary btn-sm flex items-center gap-2 bg-surface">
              <Mail className="w-4 h-4" /> Message All
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-low text-label-sm text-ink-muted border-b border-border">
                  <th className="p-4 font-semibold">Student Name</th>
                  <th className="p-4 font-semibold">Email & Contact</th>
                  <th className="p-4 font-semibold">Average Grade</th>
                  <th className="p-4 font-semibold">Integrity Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-ink-muted">Loading students...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-ink-muted">No students found.</td></tr>
                ) : students.map((s, i) => {
                  // Mock some data based on index to make the table look rich
                  const avgGrade = 85 + (i % 10) - (i % 5);
                  const isFlagged = i % 4 === 0;

                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-surface-high/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-ink-primary">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                              <UserCircle className="w-3.5 h-3.5" /> ID: {s.id.substring(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{s.email}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{avgGrade}%</span>
                          <div className="w-16 h-1.5 bg-surface-high rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${avgGrade >= 90 ? 'bg-success' : avgGrade >= 80 ? 'bg-primary' : 'bg-warning'}`} style={{ width: `${avgGrade}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {isFlagged ? (
                          <span className="flex items-center gap-1.5 text-xs text-warning-text font-bold bg-warning/10 px-2 py-1 rounded w-fit">
                            <ShieldAlert className="w-3.5 h-3.5" /> Plagiarism Warning
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 px-2 py-1 rounded w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="btn-ghost btn-sm text-primary group-hover:bg-primary/5">
                          View Profile <ChevronRight className="w-4 h-4 inline-block" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
