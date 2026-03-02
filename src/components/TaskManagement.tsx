"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Task, User } from "@/lib/types";
import { Delete, Edit, Add } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    user_id: "",
    title: "",
    description: "",
    status: "pending" as "pending" | "in_progress" | "completed",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");

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
      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            user_id: formData.user_id,
            title: formData.title,
            description: formData.description,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingTask.id);

        if (error) throw error;
        setMessage("Task updated successfully");
      } else {
        const { error } = await supabase.from("tasks").insert({
          user_id: formData.user_id,
          title: formData.title,
          description: formData.description,
          status: formData.status,
        });

        if (error) throw error;
        setMessage("Task created successfully");
      }

      resetForm();
      await fetchTasks();
    } catch (err) {
      setMessage("Error saving task");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;
      setMessage("Task deleted successfully");
      await fetchTasks();
    } catch (err) {
      setMessage("Error deleting task");
      console.error(err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      user_id: task.user_id,
      title: task.title,
      description: task.description || "",
      status: task.status,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      user_id: "",
      title: "",
      description: "",
      status: "pending",
    });
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || "Unknown";
  };

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
        <h2>Task Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Add style={{ marginRight: "0.5rem" }} /> Add Task
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
            {editingTask ? "Edit Task" : "Add New Task"}
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label>Assign To *</label>
            <select
              value={formData.user_id}
              onChange={(e) =>
                setFormData({ ...formData, user_id: e.target.value })
              }
              required
              style={{ width: "100%" }}
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label>Status *</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "pending" | "in_progress" | "completed",
                })
              }
              style={{ width: "100%" }}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
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
        {tasks.length === 0 ? (
          <p className="text-muted">No tasks found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{getUserName(task.user_id)}</td>
                  <td>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value)
                      }
                      className={`badge badge-${task.status}`}
                      style={{ cursor: "pointer", padding: "0.25rem", borderRadius: "4px" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="text-muted">
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(task)}
                      title="Edit"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task.id)}
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
