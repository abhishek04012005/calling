# Quick Start Guide

Get the Data Management Portal running in 5 minutes!

## 1. Install & Configure (2 minutes)

```bash
cd /home/abhishek/Project/datacalling2
npm install
```

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Setup Database (2 minutes)

Go to Supabase SQL Editor and paste the content from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

Then seed test data:
```sql
INSERT INTO users (email, password, name, role) 
VALUES ('admin@example.com', 'password123', 'Admin User', 'admin');
```

## 3. Start Development (1 minute)

```bash
npm run dev
```

Visit http://localhost:3000

**Login with:**
- Email: `admin@example.com`
- Password: `password123`

## What's Included

✅ **Login Page** - Email/password authentication
✅ **User Management** - Create, edit, delete users
✅ **Task Management** - Assign tasks with status tracking
✅ **Entity Management** - Manual entry + Excel upload
✅ **Notes System** - Attach notes to entities
✅ **Responsive Design** - Mobile-first CSS
✅ **Material UI Icons** - Call, WhatsApp, Edit, Delete

## Key Features

### Excel Upload
- Upload .xlsx files with: School Name | Address | Phone Number
- Parsed client-side using xlsx library
- Bulk insert into database

### School Actions
- 📞 **Call Button** - Opens dial interface
- 💬 **WhatsApp Button** - Sends templated message
- ✏️ **Edit** - Modify school details
- 🗑️ **Delete** - Remove school

### Task Status Toggle
- Select dropdown in table to change status instantly
- Three states: Pending → In Progress → Completed

### Notes Panel
- Attach notes to any school
- Shows author name and timestamp
- Users edit/delete only their own notes

## File Structure

- `src/app/page.tsx` - Login page
- `src/app/dashboard/page.tsx` - Main dashboard
- `src/components/` - All UI components
- `src/context/AuthContext.tsx` - Authentication
- `src/lib/supabase.ts` - Supabase setup
- `src/styles/globals.css` - All styling

## Next Steps

1. **Update Credentials** - Change email/password in Supabase
2. **Customize Colors** - Edit `src/styles/globals.css`:
   ```css
   --primary-color: #0066cc;  /* Change your color */
   ```
3. **Add More Data** - Use the app UI to create entities and users
4. **Deploy** - Push to Vercel: `vercel deploy`

## Troubleshooting

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001
```

**Module not found error?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database connection issues?**
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- Check Supabase project is active
- Ensure tables are created

## Commands

```bash
npm run dev       # Start development server
npm run build     # Create production build
npm run start     # Run production server
npm run lint      # Check code quality
```

## API Operations

All data operations use Supabase queries:
- `select()` - Fetch data
- `insert()` - Create records
- `update()` - Modify records
- `delete()` - Remove records
- `eq()` - Filter conditions

See components for implementation examples.

---

**Ready?** Start the dev server and explore! 🚀
