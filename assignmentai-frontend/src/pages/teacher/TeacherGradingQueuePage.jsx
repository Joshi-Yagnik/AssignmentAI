import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/shared/TopBar';
import { useToast } from '../../components/shared/Toast';
import api from '../../services/api';
import { Bot, ChevronRight, User, BookOpen, Clock, FileText, Filter, Search } from 'lucide-react';

export default function TeacherGradingQueuePage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/submissions/pending');
      setSubmissions(data || []);
    } catch {
      toast({ type: 'error', title: 'Failed to load pending submissions' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const filtered = submissions.filter(sub => {
    const studentName = `${sub.users?.first_name || ''} ${sub.users?.last_name || ''}`.toLowerCase();
    const email = (sub.users?.email || '').toLowerCase();
    const assignmentTitle = (sub.assignments?.title || '').toLowerCase();
    const q = search.toLowerCase();
    
    return studentName.includes(q) || email.includes(q) || assignmentTitle.includes(q);
  });

  return (
    <>
      <TopBar
        title="AI Grading Queue"
        subtitle="Review and confirm AI-graded submissions before publishing to students."
      />

      <main className="p-4 md:p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input 
              className="input pl-9" 
              placeholder="Search by student name, email, or assignment..."
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2 text-label-sm text-ink-muted bg-surface-low border border-border px-3 py-2 rounded-lg">
            <Filter className="w-4 h-4" />
            Showing {filtered.length} pending items
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-surface-high rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-surface-high rounded w-3/4 mb-1" />
                    <div className="h-3 bg-surface-high rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-surface-high rounded mt-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <Bot className="w-12 h-12 text-ink-muted/30 mb-4" />
            <p className="text-ink-secondary font-medium">All caught up!</p>
            <p className="text-label-sm text-ink-muted mt-1">
              There are no pending submissions waiting for AI review in your queue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(sub => {
              const a = sub.assignments;
              const u = sub.users;
              const studentName = `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || u?.email;

              return (
                <div key={sub.id} className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
                  {/* Header: Student Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 text-primary font-bold flex items-center justify-center shrink-0 uppercase">
                      {studentName.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-primary text-sm truncate">{studentName}</p>
                      <p className="text-xs text-ink-muted truncate">{u?.email}</p>
                    </div>
                  </div>

                  {/* Body: Assignment Info */}
                  <div className="mt-2 bg-surface-low border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-label-sm font-semibold text-ink-primary truncate">{a?.title}</p>
                        <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-auto pt-3 border-t border-border">
                    <button
                      className="btn-primary btn-sm w-full flex items-center justify-center gap-2"
                      onClick={() => navigate(`/teacher/review/${sub.id}`)}
                    >
                      <Bot className="w-4 h-4" /> Review AI Grade <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
