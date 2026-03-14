"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, setAuthUser } from "@/context/AuthContext";
import UserManagement from "@/components/UserManagement";
import TaskManagement from "@/components/TaskManagement";
import SchoolsManagement from "@/components/SchoolsManagement";
import {
  Logout,
  SchoolOutlined,
  PeopleOutlined,
  TaskAltOutlined,
  DashboardOutlined,
  AdminPanelSettingsOutlined,
} from "@mui/icons-material";
import styles from "./dashboard.module.css";

type TabType = "schools" | "users" | "tasks";

/* ── Helper: initials from name ─────────────────────── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Dashboard() {
  const { user, isLoading, setUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("schools");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  /* ── Loading screen ───────────────────────────────── */
  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinnerRing} />
        <p className={styles.loadingText}>Authenticating…</p>
      </div>
    );
  }

  /* ── Access denied ────────────────────────────────── */
  if (!user) {
    return (
      <div className={styles.accessDenied}>
        <div className={styles.accessCard}>
          <div className={styles.accessIcon}>🔒</div>
          <h1>Access Denied</h1>
          <p>You need to be logged in to access the dashboard.</p>
          <button
            className={styles.backBtn}
            onClick={() => { setAuthUser(null); router.push("/"); }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    setAuthUser(null);
    setUser && setUser(null);
    router.push("/");
  };

  /* ── Tab definitions ──────────────────────────────── */
  const tabs: { id: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: "schools", label: "Schools",  icon: <SchoolOutlined    className={styles.tabIcon} /> },
    { id: "users",   label: "Users",    icon: <PeopleOutlined    className={styles.tabIcon} />, adminOnly: true },
    { id: "tasks",   label: "Tasks",    icon: <TaskAltOutlined   className={styles.tabIcon} /> },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || user.role === "admin");

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className={styles.shell}>

      {/* ── Navbar ──────────────────────────────────── */}
      <nav className={styles.navbar}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            {user.role === "admin"
              ? <AdminPanelSettingsOutlined style={{ fontSize: "1.1rem" }} />
              : <DashboardOutlined         style={{ fontSize: "1.1rem" }} />
            }
          </div>
          <div className={styles.brandText}>
            <p className={styles.brandTitle}>
              {user.role === "admin" ? "Admin Dashboard" : "Dashboard"}
            </p>
            <p className={styles.brandSub}>School Management Portal</p>
            <p className={styles.mobileUserName}>{user.name}</p>
          </div>
        </div>

        {/* Right side */}
        <div className={styles.navRight}>

          {/* User chip */}
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>{getInitials(user.name)}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
            <span className={`${styles.roleTag} ${user.role === "admin" ? styles.roleAdmin : styles.roleUser}`}>
              {user.role}
            </span>
          </div>

          {/* Logout */}
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <Logout style={{ fontSize: "0.95rem" }} />
            Logout
          </button>

        </div>
      </nav>

      {/* ── Tab Bar ─────────────────────────────────── */}
      <div className={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <main className={styles.main}>
        {activeTab === "schools" && <SchoolsManagement />}
        {activeTab === "users"   && user.role === "admin" && <UserManagement />}
        {activeTab === "tasks"   && <TaskManagement />}
      </main>

    </div>
  );
}