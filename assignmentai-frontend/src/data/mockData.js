// ── Mock Data: AssignmentAI ─────────────────────────────────────────────────

export const CURRENT_USER = {
  student: { id: 'u1', name: 'Priya Sharma', role: 'student', rollNo: 'CS21B032', dept: 'Computer Science', avatar: 'PS' },
  teacher: { id: 'u2', name: 'Dr. Arjun Mehta', role: 'teacher', dept: 'CS Dept', avatar: 'AM' },
  admin:   { id: 'u3', name: 'Admin Portal',   role: 'admin',   dept: 'System',  avatar: 'AD' },
};

export const ASSIGNMENTS = [
  { id: 'a1', title: 'Machine Learning Fundamentals', course: 'CS301', courseLabel: 'Machine Learning', deadline: '2026-07-10', status: 'submitted', aiGrade: 92, maxMarks: 100 },
  { id: 'a2', title: 'Data Structures Project',       course: 'CS201', courseLabel: 'Data Structures',  deadline: '2026-07-15', status: 'pending',   aiGrade: null, maxMarks: 100 },
  { id: 'a3', title: 'Database Design Report',        course: 'CS401', courseLabel: 'Databases',         deadline: '2026-07-08', status: 'graded',    aiGrade: 85, maxMarks: 100 },
  { id: 'a4', title: 'Operating Systems Lab',         course: 'CS301', courseLabel: 'Machine Learning', deadline: '2026-07-20', status: 'pending',   aiGrade: null, maxMarks: 100 },
  { id: 'a5', title: 'Web Development Portfolio',     course: 'CS501', courseLabel: 'Web Development',  deadline: '2026-07-05', status: 'missed',    aiGrade: null, maxMarks: 100 },
  { id: 'a6', title: 'AI Ethics Essay',               course: 'CS501', courseLabel: 'Web Development',  deadline: '2026-07-25', status: 'pending',   aiGrade: null, maxMarks: 100 },
];

export const TEACHER_COURSES = [
  { id: 'c1', code: 'CS301', name: 'Machine Learning',  enrolled: 32, submissions: 75, pendingReviews: 8  },
  { id: 'c2', code: 'CS201', name: 'Data Structures',   enrolled: 28, submissions: 60, pendingReviews: 15 },
  { id: 'c3', code: 'CS401', name: 'Databases',          enrolled: 25, submissions: 90, pendingReviews: 0  },
];

export const PENDING_SUBMISSIONS = [
  { id: 's1', student: 'Priya Sharma',  rollNo: 'CS21B032', assignment: 'ML Fundamentals', course: 'CS301', submitted: 'Jul 5', aiGrade: 92, avatar: 'PS' },
  { id: 's2', student: 'Rahul Patel',   rollNo: 'CS21B041', assignment: 'Data Structures', course: 'CS201', submitted: 'Jul 4', aiGrade: 78, avatar: 'RP' },
  { id: 's3', student: 'Sneha Gupta',   rollNo: 'CS21B018', assignment: 'ML Fundamentals', course: 'CS301', submitted: 'Jul 5', aiGrade: 88, avatar: 'SG' },
  { id: 's4', student: 'Aryan Kumar',   rollNo: 'CS21B055', assignment: 'Data Structures', course: 'CS201', submitted: 'Jul 3', aiGrade: 71, avatar: 'AK' },
  { id: 's5', student: 'Meera Iyer',    rollNo: 'CS21B029', assignment: 'Database Design', course: 'CS401', submitted: 'Jul 6', aiGrade: 85, avatar: 'MI' },
];

export const VIVA_SESSIONS = [
  { id: 'v1', title: 'AI Ethics Viva',   course: 'CS501', teacher: 'Dr. Arjun Mehta', date: 'Today',    time: '3:00 PM', students: 12, status: 'upcoming' },
  { id: 'v2', title: 'ML Models Review', course: 'CS301', teacher: 'Dr. Arjun Mehta', date: 'Tomorrow', time: '10:00 AM', students: 8, status: 'scheduled' },
];

export const STUDENT_REQUESTS = [
  { id: 'r1', student: 'Priya Sharma',  rollNo: 'CS21B032', type: 'Deadline Extension',       assignment: 'ML Fundamentals',  course: 'CS301', submitted: 'Jul 5, 2:30 PM', priority: 'high',   status: 'pending',  avatar: 'PS', reason: 'I was hospitalized from Jul 3–5 and could not complete the submission. Medical certificate attached.' },
  { id: 'r2', student: 'Rahul Patel',   rollNo: 'CS21B041', type: 'Re-evaluation Request',     assignment: 'Data Structures',  course: 'CS201', submitted: 'Jul 5, 11:15 AM', priority: 'medium', status: 'pending',  avatar: 'RP', reason: 'I believe the AI grading was unfair for question 3. Please re-evaluate manually.' },
  { id: 'r3', student: 'Sneha Gupta',   rollNo: 'CS21B018', type: 'Assignment Clarification',  assignment: 'Database Design',  course: 'CS401', submitted: 'Jul 4, 4:00 PM',  priority: 'low',    status: 'pending',  avatar: 'SG', reason: 'The requirement for section 2 is unclear. Does normalization include BCNF?' },
  { id: 'r4', student: 'Aryan Kumar',   rollNo: 'CS21B055', type: 'Technical Issue – Upload',  assignment: 'OS Lab',           course: 'CS301', submitted: 'Jul 6, 9:00 AM',  priority: 'high',   status: 'pending',  avatar: 'AK', reason: 'The upload portal returned a 500 error repeatedly. Attaching screenshots.' },
  { id: 'r5', student: 'Meera Iyer',    rollNo: 'CS21B029', type: 'Viva Reschedule',           assignment: 'AI Ethics Viva',   course: 'CS501', submitted: 'Jul 6, 10:30 AM', priority: 'medium', status: 'pending',  avatar: 'MI', reason: 'I have a medical appointment at 3 PM on the same day. Can we reschedule?' },
  { id: 'r6', student: 'Kiran Bose',    rollNo: 'CS21B061', type: 'Deadline Extension',        assignment: 'Web Dev Portfolio', course: 'CS501', submitted: 'Jul 3, 1:00 PM',  priority: 'low',    status: 'resolved', avatar: 'KB', reason: 'Family emergency.' },
  { id: 'r7', student: 'Dev Sharma',    rollNo: 'CS21B009', type: 'Re-evaluation Request',     assignment: 'ML Fundamentals',  course: 'CS301', submitted: 'Jul 2',           priority: 'medium', status: 'resolved', avatar: 'DS', reason: 'Grade seems off by 10 marks.' },
];

export const ADMIN_STATS = {
  totalStudents:  1247,
  activeTeachers: 38,
  totalAssignments: 284,
  aiAccuracy: 94.7,
  vivaSessionsMonth: 127,
  systemUptime: 99.9,
};

export const DEPARTMENTS = [
  { id: 'd1', name: 'Computer Science',    courses: 3, students: 156, pendingReviews: 12 },
  { id: 'd2', name: 'Data Science',        courses: 2, students: 98,  pendingReviews: 8  },
  { id: 'd3', name: 'Information Technology', courses: 4, students: 203, pendingReviews: 19 },
];

export const RECENT_ACTIVITY = [
  { id: 'act1', user: 'Priya Sharma',  role: 'student', action: 'Submitted ML Fundamentals',  time: '2 min ago',  status: 'success' },
  { id: 'act2', user: 'Dr. Arjun Mehta', role: 'teacher', action: 'Graded 5 submissions',    time: '15 min ago', status: 'success' },
  { id: 'act3', user: 'Rahul Patel',   role: 'student', action: 'Joined AI Ethics Viva',      time: '32 min ago', status: 'info'    },
  { id: 'act4', user: 'Sneha Gupta',   role: 'student', action: 'Requested deadline extension',time: '1h ago',    status: 'warning' },
  { id: 'act5', user: 'Admin Portal',  role: 'admin',   action: 'System backup completed',    time: '2h ago',     status: 'success' },
];

export const VIVA_QUESTIONS = [
  { id: 'q1', text: 'Define Artificial Intelligence and explain its key branches.', difficulty: 'easy'   },
  { id: 'q2', text: 'What is the difference between supervised and unsupervised learning? Provide examples.', difficulty: 'medium' },
  { id: 'q3', text: 'Explain the concept of algorithmic bias and provide two real-world examples where it has caused harm.', difficulty: 'medium' },
  { id: 'q4', text: 'Describe the ethical implications of facial recognition technology in public surveillance.', difficulty: 'hard'   },
  { id: 'q5', text: 'What frameworks exist to ensure AI accountability? Name at least two international guidelines.', difficulty: 'hard'   },
  { id: 'q6', text: 'Explain the trolley problem in the context of autonomous vehicle decision-making.', difficulty: 'medium' },
  { id: 'q7', text: 'What is explainability in AI, and why does it matter for high-stakes applications?', difficulty: 'hard'   },
  { id: 'q8', text: 'How does differential privacy protect individual data in machine learning models?', difficulty: 'hard'   },
];
