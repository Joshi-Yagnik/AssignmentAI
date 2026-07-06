# AssignmentAI Backend

Node.js + Express backend powered by Supabase (PostgreSQL).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database Setup (Supabase)**
   - Go to your Supabase project.
   - Open the SQL Editor.
   - Copy the contents of `database/schema.sql` and run it to create all tables.

3. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your `SUPABASE_URL`, `SUPABASE_KEY` (use the `service_role` key if you want admin privileges across the backend), and a secure `JWT_SECRET`.

4. **Run Server**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000`.

## Features
- **Auth**: JWT based login and signup.
- **Assignments**: Full CRUD for assignments.
- **Submissions**: File upload management and grading status tracking.
- **AI Reports**: Retrieval of generated AI analysis for grading.
- **Viva Sessions**: Managing live WebRTC viva exam status.
