"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Note } from "@/lib/types";
import {
  Delete,
  Edit,
  Add,
  Close,
  NoteAltOutlined,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";
import styles from "./NotesPanel.module.css";

/* ── Props ───────────────────────────────────────────── */
interface NotesPanelProps {
  entityId: string;
  entityName?: string;
  onClose?: () => void;
  onNoteCountChange?: (count: number) => void;
}

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

/* ── Component ───────────────────────────────────────── */
export default function NotesPanel({
  entityId,
  entityName = "Entity",
  onClose,
  onNoteCountChange,
}: NotesPanelProps) {
  const [notes, setNotes]             = useState<Note[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData]       = useState({ content: "" });
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState("");

  const { user }  = useAuth();
  const supabase  = createClient();

  /* auto-dismiss message */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(t);
  }, [message]);

  /* prevent body scroll when modal is open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0); // scroll to top when modal opens
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [entityId]);

  /* ── Fetch ───────────────────────────────────────── */
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const notesData = data || [];
      setNotes(notesData);
      onNoteCountChange?.(notesData.length);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  };

  /* ── Submit ──────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setMessage("You must be logged in to add notes"); return; }

    setLoading(true);
    setMessage("");

    try {
      if (editingNote) {
        const { error } = await supabase
          .from("notes")
          .update({ content: formData.content, updated_at: new Date().toISOString() })
          .eq("id", editingNote.id);
        if (error) throw error;
        setMessage("Note updated successfully");
      } else {
        const { error } = await supabase.from("notes").insert({
          entity_id:   entityId,
          author_id:   user.id,
          author_name: user.name,
          content:     formData.content,
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

  /* ── Delete ──────────────────────────────────────── */
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

  /* ── Edit ────────────────────────────────────────── */
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

  const isError = message.toLowerCase().includes("error");

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <NoteAltOutlined style={{ fontSize: "1rem" }} />
            </div>
            <div className={styles.titleBlock}>
              <h3 className={styles.title}>{entityName}</h3>
              <p className={styles.subtitle}>Notes &amp; Observations</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.btnPrimary}
              onClick={() => {
                if (showForm && !editingNote) { resetForm(); }
                else { resetForm(); setShowForm(true); }
              }}
            >
              <Add style={{ fontSize: "0.95rem" }} />
              {showForm && !editingNote ? "Cancel" : "Add Note"}
            </button>

            {onClose && (
              <button className={styles.btnGhost} onClick={onClose} title="Close">
                <Close style={{ fontSize: "1.05rem" }} />
              </button>
            )}
          </div>
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

        {/* Scrollable body */}
        <div className={styles.body}>

          {/* Add / Edit form */}
          {showForm && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.formLabel}>
                {editingNote ? "Edit note" : "New note"}
              </label>
              <textarea
                className={styles.textarea}
                value={formData.content}
                onChange={(e) => setFormData({ content: e.target.value })}
                required
                placeholder="Write your note here…"
                autoFocus
              />
              <div className={styles.formActions}>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? "Saving…" : editingNote ? "Update Note" : "Save Note"}
                </button>
                <button type="button" className={styles.btnOutline} onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📝</div>
              <p className={styles.emptyText}>No notes yet. Add the first one!</p>
            </div>
          ) : (
            <div className={styles.notesList}>
              {notes.map((note) => (
                <div key={note.id} className={styles.noteCard}>

                  {/* Meta row */}
                  <div className={styles.noteMeta}>
                    <div className={styles.noteAuthorBlock}>
                      <div className={styles.noteAvatar}>
                        {getInitials(note.author_name)}
                      </div>
                      <div>
                        <p className={styles.noteAuthor}>{note.author_name}</p>
                        <p className={styles.noteDate}>
                          {new Date(note.created_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions — only for the author */}
                    {user?.id === note.author_id && (
                      <div className={styles.noteActions}>
                        <button
                          className={`${styles.btnGhost} ${styles.btnGhostEdit}`}
                          onClick={() => handleEdit(note)}
                          title="Edit note"
                        >
                          <Edit style={{ fontSize: "0.95rem" }} />
                        </button>
                        <button
                          className={`${styles.btnGhost} ${styles.btnGhostDelete}`}
                          onClick={() => handleDelete(note.id)}
                          title="Delete note"
                        >
                          <Delete style={{ fontSize: "0.95rem" }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <p className={styles.noteContent}>{note.content}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}