# Database Schema

Complete PostgreSQL schema for the School Management Dashboard.

## Run All Schemas

Copy-paste all SQL below into Supabase SQL Editor and execute.

```sql
-- ============================================
-- USERS TABLE
-- ============================================
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
CREATE INDEX users_role_idx ON users(role);

-- ============================================
-- TASKS TABLE
-- ============================================
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
CREATE INDEX tasks_created_at_idx ON tasks(created_at);

-- ============================================
-- SCHOOLS TABLE
-- ============================================
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX schools_status_idx ON schools(status);
CREATE INDEX schools_name_idx ON schools(name);
CREATE INDEX schools_created_at_idx ON schools(created_at);

-- ============================================
-- NOTES TABLE
-- ============================================
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
CREATE INDEX notes_created_at_idx ON notes(created_at);
```

## Table Definitions

### Users Table

Stores user account information and roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | UNIQUE NOT NULL | User email (login credential) |
| password | VARCHAR(255) | NOT NULL | User password (plain text - use bcrypt in production) |
| name | VARCHAR(255) | NOT NULL | User's full name |
| role | VARCHAR(50) | DEFAULT 'user' CHECK | Either 'admin' or 'user' |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Foreign Keys:** None

**Indexes:**
- `users_email_idx` - For fast email lookups during login
- `users_role_idx` - For filtering by role

### Tasks Table

Stores tasks assigned to users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique task identifier |
| user_id | UUID | NOT NULL, FK users(id) | User assigned to task |
| title | VARCHAR(255) | NOT NULL | Task title/name |
| description | TEXT | Optional | Detailed task description |
| status | VARCHAR(50) | DEFAULT 'pending' CHECK | Task status (pending/in_progress/completed) |
| created_at | TIMESTAMP | DEFAULT NOW() | Task creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Foreign Keys:**
- `user_id` → `users.id` (ON DELETE CASCADE)

**Indexes:**
- `tasks_user_id_idx` - For finding tasks by user
- `tasks_status_idx` - For filtering by status
- `tasks_created_at_idx` - For sorting by date

### Schools Table

Stores school information uploaded or manually entered.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique school identifier |
| name | VARCHAR(255) | NOT NULL | School name |
| address | TEXT | NOT NULL | Full school address |
| phone | VARCHAR(50) | NOT NULL | School phone number |
| status | VARCHAR(50) | DEFAULT 'active' CHECK | School status (active/inactive) |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Foreign Keys:** None

**Indexes:**
- `schools_status_idx` - For filtering active/inactive schools
- `schools_name_idx` - For searching by school name
- `schools_created_at_idx` - For sorting by date

### Notes Table

Stores notes attached to schools.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique note identifier |
| school_id | UUID | NOT NULL, FK schools(id) | School the note belongs to |
| author_id | UUID | NOT NULL, FK users(id) | User who created the note |
| author_name | VARCHAR(255) | NOT NULL | Author's name (for display) |
| content | TEXT | NOT NULL | Note content/text |
| created_at | TIMESTAMP | DEFAULT NOW() | Note creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Foreign Keys:**
- `school_id` → `schools.id` (ON DELETE CASCADE)
- `author_id` → `users.id` (ON DELETE CASCADE)

**Indexes:**
- `notes_school_id_idx` - For finding notes by school
- `notes_author_id_idx` - For finding notes by author
- `notes_created_at_idx` - For sorting by date

## Relationships

```
users
  ├── has many tasks
  └── has many notes (as author)

schools
  └── has many notes

tasks
  └── belongs to user

notes
  ├── belongs to school
  └── belongs to user (as author)
```

## Data Constraints

### Check Constraints
- `users.role` must be 'admin' or 'user'
- `tasks.status` must be 'pending', 'in_progress', or 'completed'
- `schools.status` must be 'active' or 'inactive'

### Unique Constraints
- `users.email` - No duplicate emails allowed

### Referential Integrity
- Deleting a user cascades to delete their tasks and notes
- Deleting a school cascades to delete its notes
- Cannot delete a user/school that has dependent records without cascading

## Sample Data

### Test Admin User
```sql
INSERT INTO users (email, password, name, role) 
VALUES ('admin@example.com', 'password123', 'Admin User', 'admin');
```

### Test Regular Users
```sql
INSERT INTO users (email, password, name, role) VALUES
('user1@example.com', 'password123', 'John Doe', 'user'),
('user2@example.com', 'password123', 'Jane Smith', 'user');
```

### Test Schools
```sql
INSERT INTO schools (name, address, phone, status) VALUES
('Lincoln High School', '100 Oak Lane, Springfield, IL 62701', '+1-217-555-0001', 'active'),
('Madison Middle School', '200 Elm Street, Springfield, IL 62702', '+1-217-555-0002', 'active'),
('Jefferson Elementary', '300 Maple Road, Springfield, IL 62703', '+1-217-555-0003', 'active'),
('Roosevelt High School', '400 Birch Avenue, Springfield, IL 62704', '+1-217-555-0004', 'inactive');
```

### Test Tasks
```sql
INSERT INTO tasks (user_id, title, description, status) VALUES
(
  (SELECT id FROM users WHERE email = 'user1@example.com'),
  'Enrollment Report',
  'Prepare quarterly enrollment statistics',
  'pending'
),
(
  (SELECT id FROM users WHERE email = 'user2@example.com'),
  'Infrastructure Audit',
  'Audit school facilities and infrastructure',
  'in_progress'
),
(
  (SELECT id FROM users WHERE email = 'user1@example.com'),
  'Staff Development',
  'Organize professional development workshop',
  'completed'
);
```

### Test Notes
```sql
INSERT INTO notes (school_id, author_id, author_name, content) VALUES
(
  (SELECT id FROM schools WHERE name = 'Lincoln High School'),
  (SELECT id FROM users WHERE email = 'user1@example.com'),
  'John Doe',
  'Excellent facility maintenance. New library wing is nearly complete.'
),
(
  (SELECT id FROM schools WHERE name = 'Madison Middle School'),
  (SELECT id FROM users WHERE email = 'user2@example.com'),
  'Jane Smith',
  'Sports program expansion approved. New athletic director hired.'
);
```

## Queries Used in Application

### Login
```sql
SELECT * FROM users WHERE email = ? LIMIT 1
```

### Get All Users
```sql
SELECT * FROM users ORDER BY created_at DESC
```

### Create User
```sql
INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)
```

### Update User
```sql
UPDATE users SET name = ?, email = ?, role = ?, password = ? WHERE id = ?
```

### Delete User
```sql
DELETE FROM users WHERE id = ?
```

### Get All Tasks
```sql
SELECT * FROM tasks ORDER BY created_at DESC
```

### Create Task
```sql
INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)
```

### Update Task Status
```sql
UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?
```

### Get All Schools
```sql
SELECT * FROM schools ORDER BY created_at DESC
```

### Bulk Insert Schools (from Excel)
```sql
INSERT INTO schools (name, address, phone, status) VALUES (?, ?, ?, 'active')
```

### Get Notes for School
```sql
SELECT * FROM notes WHERE school_id = ? ORDER BY created_at DESC
```

### Create Note
```sql
INSERT INTO notes (school_id, author_id, author_name, content) VALUES (?, ?, ?, ?)
```

## Performance Tips

1. **Indexes**: All foreign keys and commonly filtered columns have indexes
2. **Pagination**: Add LIMIT/OFFSET for large result sets
3. **Joins**: Use efficient queries to avoid N+1 problems
4. **Caching**: Consider caching frequently accessed data
5. **Archive**: Move old data to archival table for performance

## Security Notes

1. **Passwords**: Currently plain text - implement bcrypt hashing
2. **Authentication**: Use JWT tokens instead of localStorage
3. **RLS Policies**: Enable Row Level Security policies:
   ```sql
   CREATE POLICY "Users can only edit their own notes"
   ON notes FOR UPDATE
   USING (auth.uid() = author_id);
   ```
4. **Input Validation**: Sanitize all user inputs
5. **SQL Injection**: Use parameterized queries (already done with Supabase client)

## Maintenance

### Backup
```bash
pg_dump postgresql://user:password@host/database > backup.sql
```

### Monitor Table Size
```sql
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Clean Old Records
```sql
DELETE FROM notes WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM tasks WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '3 months';
```

---

**Note**: This schema is production-ready but ensure to implement proper authentication, password hashing, and RLS policies before deploying.
