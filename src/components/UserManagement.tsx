"use client";

import React, { useState, useEffect } from "react";
import styles from "./UserManagement.module.css";
import { createClient } from "@/lib/supabase";
import { User } from "@/lib/types";
import { Delete, Edit, Add } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    assigned_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (editingUser) {
        // Update user
        const { error } = await supabase
          .from("users")
          .update({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            assigned_number: formData.assigned_number || null,
            ...(formData.password && { password: formData.password }),
          })
          .eq("id", editingUser.id);

        if (error) throw error;
        setMessage("User updated successfully");
      } else {
        // Create new user
        const { error } = await supabase.from("users").insert({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      assigned_number: user.assigned_number || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
      assigned_number: "",
    });
  };

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
        <h2>User Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Add style={{ marginRight: "0.5rem" }} /> Add User
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes("Error") ? "alert-danger" : "alert-success"}`}>
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }} className="card">
          <h3 style={{ marginBottom: "1rem" }}>
            {editingUser ? "Edit User" : "Add New User"}
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label>Assigned Number</label>
            <input
              type="text"
              value={formData.assigned_number}
              onChange={(e) =>
                setFormData({ ...formData, assigned_number: e.target.value })
              }
              placeholder="e.g. +1234567890"
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>
              {editingUser ? "New Password (leave blank to keep current)" : "Password *"}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!editingUser}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label>Role *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as "admin" | "user",
                })
              }
              style={{ width: "100%" }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="submit" disabled={loading} className="btn btn-success">
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto" }}>
        {users.length === 0 ? (
          <p className="text-muted">No users found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned #</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.assigned_number || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.role === "admin" ? "badge-in_progress" : ""
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(user)}
                      title="Edit"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(user.id)}
                      title="Delete"
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
