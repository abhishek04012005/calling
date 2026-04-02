"use client";

import React, { useState, useEffect } from "react";
import styles from "./TaskManagement.module.css";
import { createClient } from "@/lib/supabase";
import { Task, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import {
  Delete,
  Edit,
  Add,
  PersonOff,
  TaskAltOutlined,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";

/* ── Helpers ─────────────────────────────────────────── */
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function statusSelectClass(status: string): string {
  if (status === "in_progress") return styles.statusInProgress;
  if (status === "completed")   return styles.statusCompleted;
  return styles.statusPending;
}

/* ── Component ───────────────────────────────────────── */
export default function TaskManagement() {
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [users, setUsers]             = useState<User[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [formData, setFormData]       = useState({
    user_id:     "",
    title:       "",
    description: "",
    status:      "pending" as "pending" | "in_progress" | "completed",
  });
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");

  const supabase  = createClient();
  const { user }  = useAuth();

  /* auto-dismiss message */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => { fetchTasks(); fetchUsers(); }, []);

  /* ── Fetch ───────────────────────────────────────── */
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) { console.error("Error fetching tasks:", err); }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      setUsers(data || []);
    } catch (err) { console.error("Error fetching users:", err); }
  };

  /* ── Submit ──────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMessage("");
    try {
      if (editingTask) {
        const { error } = await supabase.from("tasks").update({
          user_id:     formData.user_id || null,
          title:       formData.title,
          description: formData.description,
          status:      formData.status,
          updated_at:  new Date().toISOString(),
        }).eq("id", editingTask.id);
        if (error) throw error;
        setMessage("Task updated successfully");
      } else {
        const { error } = await supabase.from("tasks").insert({
          user_id:     formData.user_id || null,
          title:       formData.title,
          description: formData.description,
          status:      formData.status,
        });
        if (error) throw error;
        setMessage("Task created successfully");
      }
      resetForm(); await fetchTasks();
    } catch (err) {
      setMessage("Error saving task"); console.error(err);
    } finally { setLoading(false); }
  };

  /* ── Delete ──────────────────────────────────────── */
  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setMessage("Task deleted successfully"); await fetchTasks();
    } catch (err) { setMessage("Error deleting task"); console.error(err); }
  };

  /* ── Unassign ────────────────────────────────────── */
  const handleUnassign = async (taskId: string) => {
    if (!confirm("Unassign this task?")) return;
    try {
      const { error } = await supabase.from("tasks")
        .update({ user_id: null, updated_at: new Date().toISOString() }).eq("id", taskId);
      if (error) throw error;
      setMessage("Task unassigned successfully"); await fetchTasks();
    } catch (err) { setMessage("Error unassigning task"); console.error(err); }
  };

  /* ── Status change ───────────────────────────────── */
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus as any } : t));
    try {
      const { error } = await supabase.from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", taskId);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating status:", err);
      await fetchTasks(); // revert on error
    }
  };

  /* ── Edit ────────────────────────────────────────── */
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      user_id:     task.user_id || "",
      title:       task.title,
      description: task.description || "",
      status:      task.status,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false); setEditingTask(null);
    setFormData({ user_id: "", title: "", description: "", status: "pending" });
  };

  const getUserName = (userId: string | null) =>
    userId ? (users.find((u) => u.id === userId)?.name ?? "Unknown") : null;

  const filteredTasks = showAssignedOnly && user?.id
    ? tasks.filter((t) => t.user_id === user.id)
    : tasks;

  const isError = message.toLowerCase().includes("error");

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}>
              <TaskAltOutlined style={{ fontSize: "1.1rem" }} />
            </div>
            <h2 className={styles.pageTitle}>Task Management</h2>
          </div>

          <div className={styles.headerRight}>
            {/* My Tasks toggle — visible to everyone */}
            <label
              className={styles.toggleWrap}
              onClick={() => setShowAssignedOnly((v) => !v)}
            >
              <div className={`${styles.toggleTrack} ${showAssignedOnly ? styles.on : ""}`}>
                <div className={styles.toggleThumb} />
              </div>
              <span className={styles.toggleLabel}>My Tasks Only</span>
            </label>

            <button
              className={styles.btnPrimary}
              onClick={() => { if (showForm && !editingTask) { resetForm(); } else { resetForm(); setShowForm(true); } }}
            >
              <Add style={{ fontSize: "0.95rem" }} />
              {showForm && !editingTask ? "Cancel" : "Add Task"}
            </button>
          </div>
        </div>

        {/* Alert */}
        {message && (
          <div className={`${styles.alert} ${isError ? styles.alertError : styles.alertSuccess}`}>
            {isError ? <ErrorOutline style={{ fontSize: "1rem" }} /> : <CheckCircleOutline style={{ fontSize: "1rem" }} />}
            {message}
          </div>
        )}

        {/* Form Panel */}
        {showForm && (
          <div className={styles.formPanel}>
            <h3 className={styles.formTitle}>
              {editingTask ? "Edit Task" : "Add New Task"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>

                {/* Title */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Title *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Follow up with contact"
                    required
                  />
                </div>

                {/* Assign to */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Assign To</label>
                  <select
                    className={styles.formSelect}
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Status *</label>
                  <select
                    className={styles.formSelect}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Description — full width */}
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional details about this task…"
                  />
                </div>

              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? "Saving…" : editingTask ? "Update Task" : "Create Task"}
                </button>
                <button type="button" className={styles.btnOutline} onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className={styles.tableContainer}>
          {filteredTasks.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <p className={styles.emptyText}>
                {showAssignedOnly ? "No tasks assigned to you." : "No tasks found. Add one to get started."}
              </p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colTitle}>Title</th>
                  <th className={styles.colAssigned}>Assigned To</th>
                  <th className={styles.colStatus}>Status</th>
                  <th className={styles.colDate}>Created</th>
                  <th className={styles.colActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const assigneeName = getUserName(task.user_id);
                  return (
                    <tr key={task.id}>

                      {/* Title + description */}
                      <td className={styles.colTitle}>
                        <div className={styles.taskTitle}>{task.title}</div>
                        {task.description && (
                          <div className={styles.taskDesc}>{task.description}</div>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className={styles.colAssigned}>
                        <div className={styles.assigneeCell}>
                          {assigneeName ? (
                            <>
                              <div className={styles.assigneeAvatar}>{getInitials(assigneeName)}</div>
                              <span className={styles.assigneeName}>{assigneeName}</span>
                            </>
                          ) : (
                            <>
                              <div className={styles.assigneeUnassigned}>
                                <PersonOff style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} />
                              </div>
                              <span className={styles.assigneeNone}>Unassigned</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status inline select */}
                      <td className={styles.colStatus}>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className={`${styles.statusSelect} ${statusSelectClass(task.status)}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>

                      {/* Date */}
                      <td className={styles.colDate}>
                        {new Date(task.created_at).toLocaleDateString(undefined, {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className={styles.colActions}>
                        <Tooltip title="Edit task">
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                            onClick={() => handleEdit(task)}
                          >
                            <Edit style={{ fontSize: "0.95rem" }} />
                          </button>
                        </Tooltip>

                        {task.user_id && (
                          <Tooltip title="Unassign task">
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnUnassign}`}
                              onClick={() => handleUnassign(task.id)}
                            >
                              <PersonOff style={{ fontSize: "0.95rem" }} />
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip title="Delete task">
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                            onClick={() => handleDelete(task.id)}
                          >
                            <Delete style={{ fontSize: "0.95rem" }} />
                          </button>
                        </Tooltip>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}