# API & Extension Guide

Advanced guide for understanding and extending the School Management Dashboard.

## Supabase API Operations

All database operations use the Supabase client. Here are the patterns used throughout the application.

### Authentication Query

```typescript
// File: src/components/LoginForm.tsx
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("email", email)
  .single();

if (data.password === password) {
  // Login successful
  setAuthUser(user);
}
```

**Note**: Production should hash passwords with bcrypt instead.

### Select Operations

```typescript
// Get all users
const { data: users } = await supabase
  .from("users")
  .select("*")
  .order("created_at", { ascending: false });

// Get user by ID
const { data: user } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .single();

// Get with filtering
const { data: tasks } = await supabase
  .from("tasks")
  .select("*")
  .eq("user_id", userId)
  .eq("status", "pending");
```

### Insert Operations

```typescript
// Single insert
const { error } = await supabase
  .from("users")
  .insert({
    email: formData.email,
    password: formData.password,
    name: formData.name,
    role: formData.role
  });

// Bulk insert (Excel upload)
const { error } = await supabase
  .from("schools")
  .insert(parsedSchools); // Array of objects
```

### Update Operations

```typescript
// Update single record
const { error } = await supabase
  .from("users")
  .update({
    name: formData.name,
    email: formData.email,
    role: formData.role,
    updated_at: new Date().toISOString()
  })
  .eq("id", userId);

// Update with condition
const { error } = await supabase
  .from("tasks")
  .update({ status: "completed" })
  .eq("id", taskId);
```

### Delete Operations

```typescript
// Delete single record
const { error } = await supabase
  .from("users")
  .delete()
  .eq("id", userId);

// Delete with condition
const { error } = await supabase
  .from("notes")
  .delete()
  .eq("school_id", schoolId);
```

---

## File Organization Patterns

### Component Pattern

Each management component follows this pattern:

```typescript
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function ComponentName() {
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("table")
        .select("*");
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingItem) {
        // Update logic
      } else {
        // Create logic
      }
      await fetchData();
    } catch (err) {
      setMessage("Error");
    } finally {
      setLoading(false);
    }
  };

  // JSX rendering...
}
```

---

## Adding New Features

### Option 1: Add a New Tab to Dashboard

**File: src/app/dashboard/page.tsx**

```typescript
// 1. Add to TabType union
type TabType = "users" | "tasks" | "schools" | "reports"; // Add "reports"

// 2. Add button in navigation
<button
  onClick={() => setActiveTab("reports")}
  className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-secondary"}`}
>
  Reports
</button>

// 3. Add content rendering
{activeTab === "reports" && <ReportsComponent />}
```

**File: src/components/ReportsComponent.tsx**

Create following the component pattern above.

### Option 2: Add New Database Table

**Supabase SQL Editor:**

```sql
CREATE TABLE custom_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_table_created_at_idx ON custom_table(created_at);
```

**Update types: src/lib/types.ts**

```typescript
export interface CustomItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

### Option 3: Add New User Role

**Update schema:**

```sql
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'user', 'manager', 'viewer'));
```

**Update types: src/lib/types.ts**

```typescript
export interface User {
  role: "admin" | "user" | "manager" | "viewer";
  // ... other fields
}
```

**Update authorization in dashboard:**

```typescript
if (!user || !["admin", "manager"].includes(user.role)) {
  return <AccessDenied />;
}
```

---

## Styling System

### CSS Classes Available

**Layout:**
- `.container` - Max-width 1200px with responsive padding
- `.flex-center` - Flexbox centered
- `.flex-between` - Flex with space-between
- `.grid-responsive` - Auto-fit responsive grid

**Components:**
- `.card` - White card with shadow
- `.btn` - Base button styling
- `.btn-primary` - Blue button
- `.btn-danger` - Red button
- `.btn-success` - Green button
- `.btn-secondary` - Gray button

**Typography:**
- `.text-center` - Center text
- `.text-muted` - Gray smaller text
- `<h1>` through `<h6>` - Responsive headings

**Status Badges:**
- `.badge` - Base badge
- `.badge-active` - Green background
- `.badge-inactive` - Red background
- `.badge-pending` - Yellow background
- `.badge-in_progress` - Blue background
- `.badge-completed` - Green background

**Utilities:**
- `.mt-1`, `.mt-2`, `.mt-3` - Margin top
- `.mb-1`, `.mb-2`, `.mb-3` - Margin bottom

### Adding Custom Style

Edit `src/styles/globals.css`:

```css
.my-custom-class {
  background-color: var(--primary-color);
  padding: 1rem;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .my-custom-class {
    padding: 0.5rem;
  }
}
```

---

## Authentication Extended

### Implement JWT Tokens

**Replace localStorage session:**

```typescript
// context/AuthContext.tsx
const handleLogin = async (email, password) => {
  // 1. Authenticate user
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  // 2. Generate JWT token (server-side in production)
  const token = generateJWT(data.id);

  // 3. Store in httpOnly cookie
  localStorage.setItem("token", token); // Use cookie in production
  
  // 4. Set Authorization header
  supabase.auth.headers({
    Authorization: `Bearer ${token}`
  });
};
```

### Add Role-Based Access Control

```typescript
// lib/auth.ts
export const userCan = (user: User, action: string) => {
  const permissions: Record<string, string[]> = {
    "view_users": ["admin"],
    "create_user": ["admin"],
    "edit_user": ["admin"],
    "delete_user": ["admin"],
    "create_note": ["admin", "user"],
    "delete_note": ["admin"],
  };

  return permissions[action]?.includes(user.role) ?? false;
};

// In component
if (!userCan(user, "delete_user")) {
  return <button disabled>Delete</button>;
}
```

---

## Excel Upload Enhanced

### Custom Validation

```typescript
const validateSchoolData = (schools: ParsedSchool[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  schools.forEach((school, index) => {
    // Validate required fields
    if (!school.name?.trim()) {
      errors.push({ row: index + 1, message: "Name required" });
    }
    
    // Validate phone format
    if (!school.phone.match(/^\+?[\d\-\s]{10,}$/)) {
      errors.push({ row: index + 1, message: "Invalid phone format" });
    }
    
    // Validate address length
    if (school.address.length < 5) {
      errors.push({ row: index + 1, message: "Address too short" });
    }
  });

  return errors;
};

// Use in component
const errors = validateSchoolData(parsedSchools);
if (errors.length > 0) {
  showValidationErrors(errors);
  return;
}
```

### Export to Excel

```typescript
import * as XLSX from "xlsx";

const exportToExcel = (data: School[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Schools");
  XLSX.writeFile(workbook, "schools.xlsx");
};
```

---

## Performance Optimization

### Implement Pagination

```typescript
const [page, setPage] = useState(1);
const pageSize = 10;

const fetchUsers = async () => {
  const { data } = await supabase
    .from("users")
    .select("*")
    .range((page - 1) * pageSize, page * pageSize - 1);
  
  setUsers(data || []);
};
```

### Add Search & Filter

```typescript
const [searchTerm, setSearchTerm] = useState("");
const [filteredSchools, setFilteredSchools] = useState(schools);

useEffect(() => {
  const filtered = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.address.toLowerCase().includes(searchTerm.toLowerCase())
  );
  setFilteredSchools(filtered);
}, [searchTerm, schools]);

// In JSX
<input
  type="text"
  placeholder="Search schools..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

### Memoize Components

```typescript
import { memo } from "react";

const SchoolRow = memo(({ school, onEdit, onDelete }) => (
  <tr>
    <td>{school.name}</td>
    {/* ... */}
  </tr>
));

export default SchoolRow;
```

---

## API Endpoint Pattern (for future server routes)

### Next.js API Route Example

**File: src/app/api/users/route.ts**

```typescript
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("users")
      .insert(body)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
```

---

## Testing Checklist

- [ ] All CRUD operations work
- [ ] Excel upload parses correctly
- [ ] Notes display author and timestamp
- [ ] Status toggles update instantly
- [ ] Mobile layout is responsive
- [ ] Session persists on refresh
- [ ] Logout clears session
- [ ] Unauthorized access is prevented
- [ ] Error messages display correctly
- [ ] Material UI icons render properly

---

## Common Issues & Solutions

### Excel file not uploading
- Check column names exactly match
- Verify file is .xlsx format
- Ensure no empty rows at end

### Notes not appearing
- Check school_id is correct
- Verify notes are inserted in database
- Check notes table exists with foreign keys

### Session not persisting
- Verify localStorage is enabled
- Check AuthContext is wrapping app
- Clear localStorage and try again

### Password not matching on login
- Verify plain-text comparison (upgrade to bcrypt)
- Check for whitespace in password
- Ensure database has correct password

---

## Deployment Checklist

Before deploying to production:

- [ ] Hash all passwords with bcrypt
- [ ] Implement JWT authentication
- [ ] Enable Supabase RLS policies
- [ ] Add environment variable validation
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Implement error logging
- [ ] Add data backup strategy
- [ ] Set up monitoring and alerts
- [ ] Review security best practices
- [ ] Test all features thoroughly

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Hooks API](https://react.dev/reference/react/hooks)

---

This guide should help you understand the codebase and extend it with new features!
