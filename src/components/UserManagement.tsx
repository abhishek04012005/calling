"use client";

import React, { useState, useEffect } from "react";
import styles from "./UserManagement.module.css";
import { createClient } from "@/lib/supabase";
import { User } from "@/lib/types";
import {
  Delete,
  Edit,
  Add,
  PeopleOutlined,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";

/* ── Helper: initials ────────────────────────────────── */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UserManagement() {
  const [users, setUsers]             = useState<User[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData]       = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    assigned_number: "",
  });
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const supabase = createClient();

  /* auto-dismiss message */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { fetchUsers(); }, []);

  /* ── Fetch ───────────────────────────────────────── */
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  /* ── Submit ──────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (editingUser) {
        const { error } = await supabase
          .from("users")
          .update({
            name:            formData.name,
            email:           formData.email,
            role:            formData.role,
            assigned_number: formData.assigned_number || null,
            ...(formData.password && { password: formData.password }),
          })
          .eq("id", editingUser.id);
        if (error) throw error;
        setMessage("User updated successfully");
      } else {
        const { error } = await supabase.from("users").insert({
          name:            formData.name,
          email:           formData.email,
          password:        formData.password,
          role:            formData.role,
          assigned_number: formData.assigned_number || null,
        });
        if (error) throw error;
        setMessage("User created successfully");
      }

      resetForm();
      await fetchUsers();
    } catch (err) {
      setMessage("Error saving user");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ──────────────────────────────────────── */
  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      setMessage("User deleted successfully");
      await fetchUsers();
    } catch (err) {
      setMessage("Error deleting user");
      console.error(err);
    }
  };

  /* ── Edit ────────────────────────────────────────── */
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name:            user.name,
      email:           user.email,
      password:        "",
      role:            user.role,
      assigned_number: user.assigned_number || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "user", assigned_number: "" });
  };

  const isError = message.toLowerCase().includes("error");

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}>
              <PeopleOutlined style={{ fontSize: "1.1rem" }} />
            </div>
            <h2 className={styles.pageTitle}>User Management</h2>
          </div>

          <button
            className={styles.btnPrimary}
            onClick={() => {
              if (showForm && !editingUser) { resetForm(); }
              else { resetForm(); setShowForm(true); }
            }}
          >
            <Add style={{ fontSize: "0.95rem" }} />
            {showForm && !editingUser ? "Cancel" : "Add User"}
          </button>
        </div>

        {/* Alert */}
        {message && (
          <div className={`${styles.alert} ${isError ? styles.alertError : styles.alertSuccess}`}>
            {isError
              ? <ErrorOutline style={{ fontSize: "1rem" }} />
              : <CheckCircleOutline style={{ fontSize: "1rem" }} />}
            {message}
          </div>
        )}

        {/* Form Panel */}
        {showForm && (
          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>
              {editingUser ? "Edit User" : "Add New User"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>

                {/* Name */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Full Name *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    required
                  />
                </div>

                {/* Assigned Number */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Assigned Phone</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.assigned_number}
                    onChange={(e) => setFormData({ ...formData, assigned_number: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                {/* Email */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email Address *</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>

                {/* Role */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Role *</label>
                  <select
                    className={styles.formSelect}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Password — full width */}
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.formLabel}>
                    {editingUser ? "New Password" : "Password *"}
                  </label>
                  <input
                    type="password"
                    className={styles.formInput}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "Leave blank to keep current password" : "Min. 8 characters"}
                    required={!editingUser}
                  />
                  {editingUser && (
                    <span className={styles.formHint}>Leave blank to keep the existing password</span>
                  )}
                </div>

              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? "Saving…" : editingUser ? "Update User" : "Create User"}
                </button>
                <button type="button" className={styles.btnOutline} onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className={styles.tableContainer}>
          {users.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <p className={styles.emptyText}>No users found. Add one to get started.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colName}>Name</th>
                  <th className={styles.colEmail}>Email</th>
                  <th className={styles.colPhone}>Assigned #</th>
                  <th className={styles.colRole}>Role</th>
                  <th className={styles.colDate}>Created</th>
                  <th className={styles.colActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>

                    {/* Name + Avatar */}
                    <td className={styles.colName}>
                      <div className={styles.userNameCell}>
                        <div className={styles.userAvatar}>
                          {getInitials(user.name)}
                        </div>
                        <span className={styles.userName}>{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className={styles.colEmail}>{user.email}</td>

                    {/* Assigned number */}
                    <td className={styles.colPhone}>
                      {user.assigned_number || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>

                    {/* Role badge */}
                    <td className={styles.colRole}>
                      <span className={user.role === "admin" ? styles.roleAdmin : styles.roleUser}>
                        {user.role}
                      </span>
                    </td>

                    {/* Date */}
                    <td className={styles.colDate}>
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className={styles.colActions}>
                      <Tooltip title="Edit user">
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                          onClick={() => handleEdit(user)}
                        >
                          <Edit style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>
                      <Tooltip title="Delete user">
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                          onClick={() => handleDelete(user.id)}
                        >
                          <Delete style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}