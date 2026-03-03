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
  user_id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: "new" | "active" | "interested" | "inactive" | "not_interested";
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
