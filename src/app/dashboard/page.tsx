"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, setAuthUser } from "@/context/AuthContext";
import UserManagement from "@/components/UserManagement";
import TaskManagement from "@/components/TaskManagement";
import SchoolsManagement from "@/components/SchoolsManagement";
import NotesPanel from "@/components/NotesPanel";
import { Logout } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";

type TabType = "users" | "tasks" | "schools" | "notes";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("schools");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "2rem auto",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1>Access Denied</h1>
        <p>You need admin privileges to access this dashboard.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            setAuthUser(null);
            router.push("/");
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  const handleLogout = () => {
    setAuthUser(null);
    router.push("/");
  };

  return (
    <div>
      {/* Navigation Header */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0", color: "white", fontSize: "1.5rem" }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: "0.9" }}>
            Welcome, {user.name}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "white", fontSize: "0.875rem" }}>
            {user.email}
          </span>
          <IconButton
            onClick={handleLogout}
            title="Logout"
            style={{ color: "white" }}
          >
            <Logout />
          </IconButton>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
            borderBottom: "2px solid #e0e0e0",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setActiveTab("schools")}
            className={`btn ${activeTab === "schools" ? "btn-primary" : "btn-secondary"}`}
            style={{
              borderRadius: "0",
              borderBottom: activeTab === "schools" ? "3px solid var(--primary-color)" : "none",
            }}
          >
            Schools
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
            style={{
              borderRadius: "0",
              borderBottom: activeTab === "users" ? "3px solid var(--primary-color)" : "none",
            }}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`btn ${activeTab === "tasks" ? "btn-primary" : "btn-secondary"}`}
            style={{
              borderRadius: "0",
              borderBottom: activeTab === "tasks" ? "3px solid var(--primary-color)" : "none",
            }}
          >
            Tasks
          </button>
        </div>

        {/* Content Area */}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "tasks" && <TaskManagement />}
        {activeTab === "schools" && <SchoolsManagement />}
      </div>
    </div>
  );
}
