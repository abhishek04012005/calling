"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, AuthSession } from "@/lib/types";
import { createClient } from "@/lib/supabase";

const AuthContext = createContext<AuthSession | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Restore session from localStorage
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const value: AuthSession = { user, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const setAuthUser = (user: User | null) => {
  if (user) {
    localStorage.setItem("authUser", JSON.stringify(user));
  } else {
    localStorage.removeItem("authUser");
  }
};
