# Setup Guide for School Management Dashboard

Complete step-by-step instructions to get the application running.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier available at https://supabase.com)

## Step 1: Install Dependencies

```bash
cd /home/abhishek/Project/datacalling2
npm install
```

This installs:
- Next.js 16, React 19, Next.js TypeScript support
- Supabase client (@supabase/supabase-js, @supabase/ssr)
- Material UI components (@mui/material, @mui/icons-material)
- xlsx for Excel file parsing
- Emotion for styling (@emotion/react, @emotion/styled)

## Step 2: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project
3. Go to Project Settings > API
4. Copy:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Anon Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)

## Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Example:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Create Database Tables

Go to Supabase Dashboard > SQL Editor and run the following SQL:

### Create Users Table
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

CREATE INDEX users_email_idx ON users(email);
```

### Create Tasks Table
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

CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_status_idx ON tasks(status);
```

### Create Schools Table
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

CREATE INDEX schools_status_idx ON schools(status);
```

### Create Notes Table
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

CREATE INDEX notes_school_id_idx ON notes(school_id);
CREATE INDEX notes_author_id_idx ON notes(author_id);
```

## Step 5: Seed Initial Data

Run in Supabase SQL Editor:

```sql
-- Insert admin user for testing
INSERT INTO users (email, password, name, role) 
VALUES ('admin@example.com', 'password123', 'Admin User', 'admin');

-- Insert sample users
INSERT INTO users (email, password, name, role) 
VALUES 
('user1@example.com', 'password123', 'John Doe', 'user'),
('user2@example.com', 'password123', 'Jane Smith', 'user');

-- Insert sample schools
INSERT INTO schools (name, address, phone, status)
VALUES 
('Central High School', '123 Main St, City, State', '+1-555-1234', 'active'),
('West Middle School', '456 Oak Ave, City, State', '+1-555-5678', 'active'),
('East Elementary', '789 Pine Rd, City, State', '+1-555-9012', 'active');

-- Insert sample tasks
INSERT INTO tasks (user_id, title, description, status)
VALUES 
(
  (SELECT id FROM users WHERE email = 'user1@example.com'),
  'School Enrollment Report',
  'Prepare quarterly enrollment statistics',
  'pending'
),
(
  (SELECT id FROM users WHERE email = 'user2@example.com'),
  'Infrastructure Audit',
  'Audit school facilities and infrastructure',
  'in_progress'
);
```

## Step 6: Run Development Server

```bash
npm run dev
```

The application will start at http://localhost:3000

## Step 7: Login

Use the demo credentials:
- **Email**: admin@example.com
- **Password**: password123

## What You Can Do Now

### User Management Tab
- View all registered users
- Add new users (click "Add User")
- Edit user details and passwords
- Delete users
- Assign roles (admin/user)

### Tasks Tab
- View all tasks
- Create new tasks and assign to users
- Change task status from dropdown
- Edit or delete tasks

### Schools Tab
- View all schools in a responsive table
- Add schools manually via form
- **Upload Excel file** with columns:
  - School Name
  - Address
  - Phone Number
- Edit school information
- Delete schools
- Click phone icon to call
- Click WhatsApp icon to send message
- Toggle school status (active/inactive)

### Notes Panel (within Schools)
- Add notes to schools
- View author name and timestamp
- Edit your own notes
- Delete your own notes

## Build for Production

```bash
npm run build
npm run start
```

## Excel Upload Format

Create an Excel file with these columns:

| School Name | Address | Phone Number |
|-------------|---------|--------------|
| Lincoln High School | 100 Oak Lane, City | +1-555-0001 |
| Madison Middle | 200 Elm Street, City | +1-555-0002 |
| Jefferson Elem | 300 Maple Road, City | +1-555-0003 |

Save as `.xlsx` and upload via the "Upload Excel" button.

## File Structure Explanation

```
src/
├── app/                          # Next.js app directory
│   ├── page.tsx                  # Login page (/)
│   ├── layout.tsx                # Root layout with AuthProvider
│   ├── dashboard/                # Protected dashboard route
│   │   └── page.tsx              # Main dashboard (/dashboard)
│   └── globals.css               # (removed - using custom styles)
│
├── components/                   # Reusable React components
│   ├── LoginForm.tsx             # Handles login validation
│   ├── UserManagement.tsx        # User CRUD operations
│   ├── TaskManagement.tsx        # Task CRUD and status management
│   ├── SchoolsManagement.tsx    # Schools CRUD, Excel import, action buttons
│   └── NotesPanel.tsx            # Note CRUD for schools
│
├── context/                      # React Context for state management
│   └── AuthContext.tsx           # Authentication and session management
│
├── lib/                          # Utility functions and configurations
│   ├── supabase.ts              # Supabase client setup
│   ├── types.ts                 # TypeScript type definitions
│   └── styles.ts                # Responsive CSS utilities
│
└── styles/                       # Global styles
    └── globals.css              # All styling rules
```

## Key Implementation Details

### Authentication Flow
1. User enters email/password on login page
2. App queries `users` table for matching email
3. Compares plain-text password (upgrade to bcrypt for production)
4. On success, stores user object in localStorage
5. AuthContext restores session on page reload
6. Dashboard checks for admin role, redirects if not authenticated

### Data Persistence
- Uses Supabase PostgreSQL database
- All data operations via Supabase client
- localStorage only stores minimal session info

### Responsive Design
- CSS Grid: `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
- Mobile breakpoint: 768px
- Flexible padding and font sizing
- Touch-friendly buttons and inputs

## Troubleshooting

### "Cannot find module '@supabase/ssr'"
```bash
npm install @supabase/ssr
```

### Excel upload shows "No valid data found"
- Ensure columns are exactly: "School Name", "Address", "Phone Number"
- Check for empty rows at the end
- Use .xlsx format (not .xlsm or .xls)

### Login fails with "Invalid email or password"
- Verify credentials match the database
- Check if user exists in the users table
- Remember: passwords are case-sensitive

### CORS errors when uploading
- CORS should be configured in Supabase settings
- Check that your domain is allowed in Supabase auth settings

### Notes not appearing
- Ensure notes table has the school_id foreign key reference
- Check that notes are being inserted (check Supabase dashboard)
- Verify school relationship is correct

## Next Steps

### Immediate (Development)
1. Customize logo and app name
2. Update color scheme in globals.css
3. Add more user roles/permissions
4. Implement data validation rules

### Short Term (Days)
1. Add password hashing (bcrypt)
2. Implement server-side authentication
3. Add Supabase RLS policies
4. Add data search and filters

### Medium Term (Weeks)
1. Add activity logging
2. Implement task comments
3. Add school/user relationships
4. Create reporting dashboard

### Long Term (Months)
1. Mobile app integration
2. Advanced analytics
3. Bulk operations
4. API for third-party integrations

## Security Recommendations

⚠️ **Before Production:**

1. **Hash Passwords**: Implement bcrypt on backend
   ```js
   import bcrypt from 'bcrypt';
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **Server-Side Auth**: Replace localStorage with JWT tokens

3. **RLS Policies**: Enable Supabase Row Level Security
   ```sql
   CREATE POLICY "Users can only see their own data"
   ON tasks FOR SELECT
   USING (auth.uid() = user_id);
   ```

4. **HTTPS Only**: Deploy to Vercel or similar with HTTPS

5. **Validate Input**: Add sanitization for all user inputs

6. **Rate Limiting**: Implement to prevent abuse

## Support & Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Material UI Documentation](https://mui.com/material-ui/getting-started/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Questions?

Refer to:
- README.md for feature overview
- This file (SETUP_GUIDE.md) for configuration
- Code comments in components for implementation details
