"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Note } from "@/lib/types";
import { Delete, Edit, Add } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import { useAuth } from "@/context/AuthContext";
import styles from "./NotesPanel.module.css";


interface NotesPanelProps {
  schoolId: string;
  schoolName?: string;
  onClose?: () => void;
}

export default function NotesPanel({
  schoolId,
  schoolName = "School",
  onClose,
}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    content: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    fetchNotes();
  }, [schoolId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage("You must be logged in to add notes");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (editingNote) {
        const { error } = await supabase
          .from("notes")
          .update({
            content: formData.content,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingNote.id);

        if (error) throw error;
        setMessage("Note updated successfully");
      } else {
        const { error } = await supabase.from("notes").insert({
          school_id: schoolId,
          author_id: user.id,
          author_name: user.name,
          content: formData.content,
        });

        if (error) throw error;
        setMessage("Note added successfully");
      }

      resetForm();
      await fetchNotes();
    } catch (err) {
      setMessage("Error saving note");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);

      if (error) throw error;
      await fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ content: note.content });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setFormData({ content: "" });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
        <h3>Notes - {schoolName}</h3>
        {onClose && (
          <button className="btn btn-secondary" onClick={onClose} style={{ marginRight: "0.5rem" }}>
            Close
          </button>
        )}
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Add style={{ marginRight: "0.25rem" }} /> Add Note
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes("Error") ? "alert-danger" : "alert-success"}`}>
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "0.75rem" }}>
            {editingNote ? "Edit Note" : "Add New Note"}
          </h4>

          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            required
            placeholder="Write your note here..."
            style={{ width: "100%", minHeight: "80px", marginBottom: "1rem" }}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
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

      {notes.length === 0 ? (
        <p className="text-muted">No notes yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                backgroundColor: "#fff",
                padding: "1rem",
                borderLeft: "4px solid var(--primary-color)",
                borderRadius: "4px",
              }}
            >
              <div
                className="flex-between"
                style={{
                  marginBottom: "0.5rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <strong>{note.author_name}</strong>
                  <span className="text-muted" style={{ marginLeft: "0.5rem" }}>
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  {user?.id === note.author_id && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(note)}
                        title="Edit"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(note.id)}
                        title="Delete"
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </div>
              </div>
              <p style={{ margin: "0", whiteSpace: "pre-wrap" }}>
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
