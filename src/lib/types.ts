export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  assigned_number?: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string | null;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: string;
  entity_type?: string; // e.g., 'school', 'interior', 'construction' (optional for backward compatibility)
  name: string;
  address: string;
  phone: string;
  status: "new" | "active" | "interested" | "inactive" | "unassigned" | "not_interested" | "assigned";
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  school_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User | null;
  isLoading: boolean;
  setUser?: (user: User | null) => void;
}
