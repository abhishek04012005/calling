# School Management Admin Dashboard

A modern, responsive Next.js TypeScript application with Supabase backend for managing schools, users, tasks, and notes with Material UI components.

## Features

- **Authentication**: Login system with email/password validation against a users table
- **User Management**: Admin can create, edit, delete users and assign roles (admin/user)
- **Task Management**: Assign tasks to users with status tracking (pending/in-progress/completed)
- **Schools Management**: 
  - Manual entry and Excel file upload (client-side parsing with xlsx)
  - Responsive table with school name, address, phone number
  - Material UI icons for call and WhatsApp actions
  - Status toggle (active/inactive)
- **Notes System**: 
  - Attach notes to schools
  - Add, edit, delete notes with author names and timestamps
  - Users can only edit/delete their own notes
- **Responsive Design**: Mobile-first CSS with full responsiveness across devices
- **Client Session**: localStorage-based session persistence

## Tech Stack

- **Frontend**: Next.js 16+ with TypeScript
- **Backend**: Supabase (PostgreSQL)
- **UI Components**: Material UI for icons
- **Styling**: Custom responsive CSS utility file
- **File Parsing**: xlsx library for Excel files
- **State Management**: React Context API

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Login page
│   ├── layout.tsx            # Root layout with AuthProvider
│   ├── dashboard/
│   │   └── page.tsx          # Protected admin dashboard
├── components/
│   ├── LoginForm.tsx         # Login form component
│   ├── UserManagement.tsx    # User CRUD operations
│   ├── TaskManagement.tsx    # Task CRUD and status toggles
│   ├── SchoolsManagement.tsx # Schools CRUD, Excel upload, action buttons
│   └── NotesPanel.tsx        # School notes system
├── context/
│   └── AuthContext.tsx       # Authentication context with localStorage
├── lib/
│   ├── supabase.ts          # Supabase client initialization
│   ├── types.ts             # TypeScript interfaces
│   └── styles.ts            # Responsive style utilities
└── styles/
    └── globals.css          # Comprehensive responsive CSS
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Schools Table
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notes Table
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Supabase Database Tables

Run the SQL schema above in your Supabase SQL editor.

### 4. Seed Initial Data (Optional)

```sql
INSERT INTO users (email, password, name, role) 
VALUES ('admin@example.com', 'password123', 'Admin User', 'admin');
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo Login:**
- Email: `admin@example.com`
- Password: `password123`

## Key Features Overview

### Login Page
- Email/password validation
- localStorage session persistence
- Automatic redirect to dashboard

### Dashboard
- Protected route (admin only)
- Tab navigation (Schools, Users, Tasks)
- Responsive mobile-first design

### User Management
- Create, Read, Update, Delete users
- Role assignment (admin/user)
- Password change editing

### Task Management
- Assign multiple tasks to users
- Status tracking dropdown
- Full CRUD operations

### Schools Management
- **Excel Upload**: Columns "School Name", "Address", "Phone Number"
- **CRUD Operations**: Add, edit, delete schools
- **Action Buttons**: Call and WhatsApp icons
- **Status Toggle**: Active/inactive from table

### Notes System
- Attach notes to schools
- Author name and timestamp
- Users edit/delete only their own notes
- Multiline note support

## Responsive Design

- Mobile-first CSS approach
- GridResponsive component for 3-column to 1-column layouts
- Touch-friendly button sizes
- Adaptive typography

Breakpoint: 768px

## Material UI Icons

- `Add`, `Delete`, `Edit`, `Call`, `Phone`, `Logout`

## Session Management

Uses localStorage to store minimal user session data and restore on page refresh.

## Security Notes

⚠️ Production considerations:
- Implement bcrypt for password hashing
- Use server-side authentication with JWT
- Enable Supabase RLS policies
- Hash passwords before storing

This is a [Next.js](https://nextjs.org) project.
This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
