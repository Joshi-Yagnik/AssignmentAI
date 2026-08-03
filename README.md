# 🎓 AssignmentAI

**AssignmentAI** is a full-stack AI-powered academic platform that automates assignment grading, enables AI-driven viva examinations, and provides deep analytics — all in one system for Admins, Teachers, and Students.

---

## 🚀 Features

### 👨‍💼 Admin
- Manage **Institutes**, **Departments**, **Subjects**, and **Users**
- Configure the **AI Engine** (grading model settings, thresholds)
- View **Global Reports** and per-institution analytics
- Manage platform settings and security logs
- Oversee viva exam scheduling

### 👩‍🏫 Teacher
- Create and **deploy assignments** with question PDFs and answer-key PDFs
- Upload **study materials** for students
- **Review and annotate** student submissions
- Monitor a **grading queue** powered by BullMQ + Redis
- View **analytics** per assignment and per student
- Schedule and **monitor live Viva exams**
- Handle **student requests** (re-evaluation, extensions, etc.)

### 👨‍🎓 Student
- View and **submit assignments** (PDF uploads)
- Real-time **AI grading** feedback per question
- View detailed **AI evaluation reports**
- Participate in **Viva (oral) exams** with webcam & face verification
- Browse **study materials** shared by teachers
- Track **grades** and raise **requests** to teachers
- Receive in-app **notifications**

---

## 🏗️ Architecture

```
AssignmentAI/
├── assignmentai-frontend/   # React + Vite + Tailwind CSS (TypeScript)
├── assignmentai-backend/    # Node.js + Express + Socket.IO
│   └── src/
│       ├── routes/          # REST API routes
│       ├── services/        # Grok AI, Mail, Notifications
│       ├── workers/         # BullMQ grading worker
│       ├── queues/          # Redis queue definitions
│       ├── sockets/         # Socket.IO event handlers & viva sockets
│       ├── middleware/      # JWT authentication
│       └── config/          # Supabase client configs
├── supabase_migration.sql   # Main DB schema
├── *_migration.sql          # Incremental migrations
└── vercel.json              # Frontend deployment config
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express 5, Socket.IO |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage (PDF buckets) |
| **AI Grading** | Grok API (xAI) |
| **Job Queue** | BullMQ + Redis (ioredis) |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **OCR** | Tesseract.js |
| **PDF Parsing** | pdf-parse |
| **Email** | Nodemailer (Gmail SMTP) |
| **Face Detection** | face-api.js (viva verification) |
| **Real-time** | Socket.IO (live viva & notifications) |
| **Deployment** | Vercel (frontend), Any Node host (backend) |

---

## 📋 Prerequisites

- **Node.js** v18+
- **Redis** (local or cloud — e.g., Upstash)
- **Supabase** project (free tier works)
- **Grok API key** from [console.x.ai](https://console.x.ai)
- **Gmail App Password** for email delivery (optional)

---

## ⚙️ Environment Setup

### Backend `.env`

Create `assignmentai-backend/.env` with the following:

```env
# Server
PORT=5000

# Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<your-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# JWT
JWT_SECRET=<your-strong-secret>

# BullMQ / Redis
REDIS_URL=redis://localhost:6379

# Grok (xAI) AI Grading — https://console.x.ai
GROK_API_KEY=<your-grok-api-key>

# Email Delivery (Nodemailer / Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail-address>
SMTP_PASS=<your-16-char-gmail-app-password>
SMTP_FROM_EMAIL=<your-gmail-address>

# CORS (comma-separated list of allowed frontend origins)
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```

> **Getting a Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords.

---

## 🗄️ Database Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in the Supabase dashboard.
3. Run the migrations **in order**:

```
supabase_migration.sql               ← Run first (core schema)
assignment_submission_migration.sql
ai_config_migration.sql
ai_evaluation_migration.sql
analytics_migration.sql
notifications_migration.sql
platform_settings_migration.sql
security_logs_migration.sql
student_requests_migration.sql
study_materials_migration.sql
viva_sessions_migration.sql
```

---

## 🏃 Running Locally

### 1. Backend

```bash
cd assignmentai-backend
npm install
npm run dev        # Starts with --watch (auto-restarts on changes)
```

The server runs at **http://localhost:5000**

### 2. Frontend

```bash
cd assignmentai-frontend
npm install
npm run dev        # Starts Vite dev server
```

The app runs at **http://localhost:5173**

> **Note**: Redis must be running locally (`redis-server`) or `REDIS_URL` must point to a cloud Redis instance for the grading queue to work.

---

## 📡 API Overview

All routes are prefixed with `/api`.

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, password management |
| `/api/assignments` | CRUD for assignments |
| `/api/submissions` | Submit, retrieve, and grade submissions |
| `/api/reports` | AI evaluation reports per student |
| `/api/storage` | Signed URL generation for file uploads |
| `/api/notifications` | In-app notification management |
| `/api/admin` | Admin-level platform management |
| `/api/admin/users` | User management (CRUD) |
| `/api/viva` | Viva session scheduling and results |
| `/api/materials` | Study material upload and retrieval |
| `/api/requests` | Student re-evaluation / extension requests |
| `/health` | Health check endpoint |

---

## 🔄 Background Jobs (BullMQ)

Assignment grading runs **asynchronously** via a BullMQ worker backed by Redis:

1. Student submits a PDF → job queued in Redis
2. `gradingWorker.js` picks up the job
3. PDF is parsed via `pdf-parse` / OCR via `tesseract.js`
4. Content sent to **Grok AI** for per-question evaluation
5. Results saved to Supabase; student notified via Socket.IO

---

## 🎙️ Viva Exam Flow

1. Teacher creates a viva session from the **Viva Page**
2. Students join the **Viva Lobby** using a session code
3. Face verification runs via `face-api.js` (webcam)
4. AI conducts and evaluates the viva over **Socket.IO**
5. Teacher monitors responses live from **Viva Monitor Page**
6. Results are stored and viewable in **Viva Report**

---

## 📁 Supabase Storage Buckets

The backend auto-creates these buckets on startup:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `question-papers` | ✅ Yes | Assignment question PDFs |
| `answer-keys` | ❌ No | Teacher answer key PDFs |
| `submissions` | ❌ No | Student submission PDFs |
| `study-materials` | ✅ Yes | Shared study material PDFs |

Max file size: **20 MB** per file. Allowed type: `application/pdf`.

---

## 🚢 Deployment

### Frontend (Vercel)

The root `vercel.json` is configured for the frontend:

```json
{
  "buildCommand": "cd assignmentai-frontend && npm install && npm run build",
  "outputDirectory": "assignmentai-frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Push to GitHub and import the repo into [vercel.com](https://vercel.com). Set `VITE_API_URL` environment variable in the Vercel dashboard to point to your deployed backend URL.

### Backend

Deploy to any Node.js host (Railway, Render, Fly.io, etc.):

```bash
npm start   # node src/index.js
```

Ensure your Redis instance is accessible and all `.env` variables are configured in your hosting platform.

---

## 🔐 User Roles

| Role | Access |
|------|--------|
| `admin` | Full platform management |
| `teacher` | Assignment lifecycle, grading, viva, analytics |
| `student` | Submissions, grades, viva, materials, requests |

---

## 📄 License

ISC License — see [package.json](./assignmentai-backend/package.json) for details.

---

<div align="center">
  Built with ❤️ using React, Express, Supabase, and Grok AI
</div>
