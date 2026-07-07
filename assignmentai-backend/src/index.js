require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const submissionRoutes = require('./routes/submission.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');
const usersRoutes = require('./routes/users.routes');
const storageRoutes = require('./routes/storage.routes');
const vivaRoutes = require('./routes/viva.routes');

// Start background grading worker (BullMQ + Redis)
require('./workers/gradingWorker');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/admin/users', usersRoutes);  // must be before /api/admin
app.use('/api/admin', adminRoutes);
app.use('/api/viva', vivaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For dev, allow all
    methods: ['GET', 'POST']
  }
});

// Pass io to our socket handler
require('./sockets/vivaSocket')(io);

// ── Ensure Supabase Storage buckets exist ─────────────────────────────────────
async function ensureStorageBuckets() {
  const supabaseAdmin = require('./config/supabaseAdmin');
  const buckets = [
    { name: 'question-papers', public: true  },
    { name: 'answer-keys',     public: false },
    { name: 'submissions',     public: false },
  ];

  for (const bucket of buckets) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket.name, {
      public: bucket.public,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 20971520, // 20 MB
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`[Storage] Failed to create bucket "${bucket.name}":`, error.message);
    } else if (!error) {
      console.log(`[Storage] Bucket created: ${bucket.name}`);
    }
  }
}

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureStorageBuckets();
});
