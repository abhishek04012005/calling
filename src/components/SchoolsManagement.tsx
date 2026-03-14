"use client";

import React, { useState, useEffect } from "react";
import styles from "./SchoolsManagement.module.css";
import { createClient } from "@/lib/supabase";
import { School, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import {
  Delete,
  /* Edit removed */
  Add,
  WhatsApp,
  Call,
  NoteAdd,
  GroupAdd,
  GroupRemove,
  Search,
  SchoolOutlined,
  UploadFile,
  LocationOn,
  Close,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  CircularProgress,
  Badge,
} from "@mui/material";
import NotesPanel from "@/components/NotesPanel";

/* ── Types ──────────────────────────────────────────── */
interface ParsedSchool {
  name: string;
  address: string;
  phone: string;
}

/* ── Helper: truncate address to first 3 words ──────── */
function truncateAddress(address: string): string {
  const words = address.trim().split(/\s+/);
  if (words.length <= 3) return address;
  return words.slice(0, 3).join(" ") + "…";
}

/* ── Status helper type ─────────────────────────────── */
type StatusKey =
  | "new" | "active" | "interested" | "inactive"
  | "unassigned" | "assigned" | "not_interested";

/* ── Main Component ─────────────────────────────────── */
export default function SchoolsManagement() {
  const [schools, setSchools]               = useState<School[]>([]);
  const [noteCounts, setNoteCounts]         = useState<Record<string, number>>({});
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [showUpload, setShowUpload]         = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [editingSchool, setEditingSchool]   = useState<School | null>(null);
  const [searchText, setSearchText]         = useState("");
  const [statusFilter, setStatusFilter]     = useState<string>("");

  // Assignment-related data (used for bulk assignments)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // note: assignedUsers state removed since assignment UI gone

  // Bulk
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal]         = useState(false);
  const [bulkAssignedUsers, setBulkAssignedUsers] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading]             = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "", address: "", phone: "", status: "new",
  });
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");

  // Notes
  const [notesSchoolId, setNotesSchoolId]     = useState<string | null>(null);
  const [notesSchoolName, setNotesSchoolName] = useState<string>("");

  // Status update guard
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Address popup
  const [addressPopup, setAddressPopup] = useState<{ name: string; address: string } | null>(null);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'single' | 'bulk'; schoolId?: string; schoolName?: string }>(
    { open: false, type: 'single' }
  );

  const { user } = useAuth();
  const supabase = createClient();

  /* ── Auto-dismiss message ─────────────────────────── */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  /* ── Init ─────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    fetchSchools();
    if (user.role === "admin") fetchAllUsers();
  }, [user]);

  /* ── Data fetches ─────────────────────────────────── */
  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users").select("*").eq("role", "user").order("name", { ascending: true });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchSchools = async () => {
    if (!user) { setSchools([]); return; }
    setSchoolsLoading(true);
    try {
      let query = supabase.from("schools").select("*");

      if (user.role !== "admin") {
        const { data: assignments, error: assignError } = await supabase
          .from("user_school_assignments").select("school_id").eq("user_id", user.id);
        if (assignError) throw assignError;
        const assignedIds = assignments?.map((a: { school_id: string }) => a.school_id) || [];

        if (assignedIds.length === 0 && !user.assigned_number) {
          setSchools([]); setSchoolsLoading(false); return;
        }
        if (user.assigned_number) {
          const phoneVal = user.assigned_number.replace(/'/g, "''");
          query = assignedIds.length > 0
            ? query.or(`id.in.(${assignedIds.join(",")}),phone.eq.${phoneVal}`)
            : query.eq("phone", phoneVal);
        } else {
          query = query.in("id", assignedIds);
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      const schoolList: School[] = data || [];
      setSchools(schoolList);

      const counts: Record<string, number> = {};
      for (const s of schoolList) {
        const { count } = await supabase
          .from("notes").select("id", { head: true, count: "exact" }).eq("school_id", s.id);
        counts[s.id] = count || 0;
      }
      setNoteCounts(counts);
    } catch (err) {
      console.error("Error fetching schools:", err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  /* ── Upload ───────────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setMessage("");
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const wb = XLSX.read(ev.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws);
          const parsed: ParsedSchool[] = (rows as any[])
            .map((r) => ({
              name:    r["School Name"] || r["name"] || "",
              address: r["Address"]     || r["address"] || "",
              phone:   String(r["Phone Number"] || r["phone"] || "").trim(),
            }))
            .filter((s) => s.name && s.address && s.phone);

          if (!parsed.length) throw new Error("No valid data. Columns: School Name, Address, Phone Number");

          const { data: existing } = await supabase.from("schools").select("phone");
          const existPhones = new Set(existing?.map((s: any) => s.phone) || []);
          const toInsert: ParsedSchool[] = [];
          const dupes: string[] = [];
          parsed.forEach((s) => {
            if (existPhones.has(s.phone)) { dupes.push(s.phone); }
            else { toInsert.push(s); existPhones.add(s.phone); }
          });

          if (!toInsert.length) throw new Error("All phone numbers already exist");
          const { error: ins } = await supabase.from("schools")
            .insert(toInsert.map((s) => ({ ...s, status: "new" })));
          if (ins) throw ins;

          setMessage(`Uploaded ${toInsert.length} schools${dupes.length ? `. Skipped ${dupes.length} duplicate(s).` : "."}`);
          setShowUpload(false);
          await fetchSchools();
        } catch (err: any) {
          setMessage(`Error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } finally {
      setLoading(false);
    }
  };

  /* ── Add / Edit form ──────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      if (editingSchool) {
        const { error } = await supabase.from("schools").update({
          name: formData.name, address: formData.address,
          phone: formData.phone, status: formData.status || editingSchool.status,
          updated_at: new Date().toISOString(),
        }).eq("id", editingSchool.id);
        if (error) throw error;
        setMessage("School updated successfully");
      } else {
        const { error } = await supabase.from("schools").insert({
          name: formData.name, address: formData.address,
          phone: formData.phone, status: formData.status || "new",
        });
        if (error) throw error;
        setMessage("School created successfully");
      }
      resetForm(); await fetchSchools();
    } catch (err) {
      setMessage("Error saving school"); console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (schoolId: string, schoolName: string) => {
    setDeleteModal({ open: true, type: 'single', schoolId, schoolName });
  };


  const resetForm = () => {
    setShowForm(false); setEditingSchool(null);
    setFormData({ name: "", address: "", phone: "", status: user?.role === "admin" ? "new" : "active" });
  };

  /* ── Contact actions ──────────────────────────────── */
  const openWhatsApp = (phone: string) => {
    let digits = phone.replace(/[^0-9]/g, "");
    if (!digits.startsWith("91")) digits = `91${digits}`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent("Hello! I'm contacting regarding your school.")}`, "_blank");
  };
  const callSchool = (phone: string) => { window.location.href = `tel:${phone}`; };

  /* assignment modal logic removed - feature no longer used */

  /* ── Bulk actions ─────────────────────────────────── */
  const handleBulkToggleUser = async (userId: string) => {
    if (!selectedSchoolIds.length) return;
    const isAll = bulkAssignedUsers.includes(userId);
    try {
      if (isAll) {
        const { error } = await supabase.from("user_school_assignments")
          .delete().eq("user_id", userId).in("school_id", selectedSchoolIds);
        if (error) throw error;
        setBulkAssignedUsers((p) => p.filter((id) => id !== userId));
      } else {
        const { error } = await supabase.from("user_school_assignments")
          .insert(selectedSchoolIds.map((sid) => ({ user_id: userId, school_id: sid, assigned_by: user?.id })));
        if (error) throw error;
        setBulkAssignedUsers((p) => [...p, userId]);
        await supabase.from("schools").update({ status: "assigned" }).in("id", selectedSchoolIds);
        setSchools((p) => p.map((s) => selectedSchoolIds.includes(s.id) ? { ...s, status: "assigned" } : s));
      }
    } catch (err) {
      setMessage("Error updating bulk assignment"); console.error(err);
    }
  };

  const closeBulkModal = async () => {
    setShowBulkModal(false); setBulkAssignedUsers([]); setSelectedSchoolIds([]);
    await fetchSchools();
  };

  const handleBulkDelete = async () => {
    setDeleteModal({ open: true, type: 'bulk' });
  };

  /* ── Confirmed delete ──────────────────────────────── */
  const confirmDelete = async () => {
    setLoading(true);
    try {
      if (deleteModal.type === 'single' && deleteModal.schoolId) {
        const { error } = await supabase.from("schools").delete().eq("id", deleteModal.schoolId);
        if (error) throw error;
        setMessage("School deleted successfully");
      } else if (deleteModal.type === 'bulk') {
        const { error } = await supabase.from("schools").delete().in("id", selectedSchoolIds);
        if (error) throw error;
        setMessage(`Deleted ${selectedSchoolIds.length} school(s)`);
        setSelectedSchoolIds([]);
      }
      setDeleteModal({ open: false, type: 'single' });
      await fetchSchools();
    } catch (err) {
      setMessage("Error deleting school(s)"); console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnassignAll = async () => {
    if (!confirm(`Unassign all users from ${selectedSchoolIds.length} school(s)?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_school_assignments")
        .delete().in("school_id", selectedSchoolIds);
      if (error) throw error;
      await supabase.from("schools")
        .update({ status: "unassigned", updated_at: new Date().toISOString() })
        .in("id", selectedSchoolIds);
      setSchools((p) => p.map((s) => selectedSchoolIds.includes(s.id) ? { ...s, status: "unassigned" } : s));
      setMessage("Unassigned all users from selected schools");
      await fetchSchools();
    } catch (err) {
      setMessage("Error unassigning users"); console.error(err);
    } finally { setLoading(false); }
  };

  /* ── Status inline update ─────────────────────────── */
  const handleStatusChange = async (school: School, val: StatusKey) => {
    if (statusUpdating === school.id) return;
    setStatusUpdating(school.id);
    const prev = school.status;
    setSchools((p) => p.map((s) => s.id === school.id ? { ...s, status: val } : s));
    try {
      const { error } = await supabase.from("schools")
        .update({ status: val, updated_at: new Date().toISOString() }).eq("id", school.id);
      if (error) {
        setSchools((p) => p.map((s) => s.id === school.id ? { ...s, status: prev } : s));
        setMessage("Error updating status");
      }
    } catch {
      setSchools((p) => p.map((s) => s.id === school.id ? { ...s, status: prev } : s));
      setMessage("Error updating status");
    } finally {
      setStatusUpdating(null);
    }
  };

  /* ── Filtered list ────────────────────────────────── */
  const filteredSchools = schools.filter((s) => {
    const matchesName   = s.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    return matchesName && matchesStatus;
  });

  const allChecked =
    filteredSchools.length > 0 && selectedSchoolIds.length === filteredSchools.length;

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}>
              <SchoolOutlined fontSize="small" />
            </div>
            <h2 className={styles.pageTitle}>Schools Management</h2>
          </div>

          <div className={styles.headerActions}>
            {user?.role === "admin" && (
              <>
                <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
                  <Add fontSize="small" /> Add School
                </button>
                <button className={styles.btnOutline} onClick={() => setShowUpload((v) => !v)}>
                  <UploadFile fontSize="small" /> Upload Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Alert */}
        {message && (
          <div className={`${styles.alert} ${message.toLowerCase().includes("error") ? styles.alertError : styles.alertSuccess}`}>
            {message.toLowerCase().includes("error")
              ? <ErrorOutline fontSize="small" />
              : <CheckCircleOutline fontSize="small" />}
            {message}
          </div>
        )}

        {/* Upload panel */}
        {showUpload && (
          <div className={styles.uploadPanel}>
            <h3>Upload Schools from Excel</h3>
            <p>Columns required: <strong>School Name</strong>, <strong>Address</strong>, <strong>Phone Number</strong></p>
            <input
              type="file" accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={loading}
              className={styles.fileInput}
            />
            <button className={styles.btnOutline} onClick={() => setShowUpload(false)}>Cancel</button>
          </div>
        )}

        {/* Notes panel */}
        {notesSchoolId && (
          <NotesPanel
            schoolId={notesSchoolId}
            schoolName={notesSchoolName}
            onClose={() => { setNotesSchoolId(null); setNotesSchoolName(""); }}
            onNoteCountChange={(count) =>
              setNoteCounts((p) => ({ ...p, [notesSchoolId]: count }))
            }
          />
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search schools…"
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="interested">Interested</option>
            <option value="inactive">Inactive</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>

        {/* Bulk bar */}
        {selectedSchoolIds.length > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{selectedSchoolIds.length} selected</span>
            <div className={styles.bulkActions}>
              {user?.role === "admin" && (
                <>
                  <button
                    className={styles.btnOutline}
                    onClick={async () => {
                      setShowBulkModal(true); setBulkLoading(true);
                      try {
                        const { data } = await supabase
                          .from("user_school_assignments")
                          .select("user_id, school_id")
                          .in("school_id", selectedSchoolIds);
                        const countMap: Record<string, number> = {};
                        (data || []).forEach((r: any) => {
                          countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
                        });
                        setBulkAssignedUsers(
                          allUsers.filter((u) => countMap[u.id] === selectedSchoolIds.length).map((u) => u.id)
                        );
                      } catch { setMessage("Error loading assignments"); }
                      finally { setBulkLoading(false); }
                    }}
                  >
                    <GroupAdd fontSize="small" /> Assign Users
                  </button>
                  <button className={styles.btnOutline} onClick={handleBulkUnassignAll} disabled={loading}>
                    <GroupRemove fontSize="small" /> Unassign All
                  </button>
                </>
              )}
              <button className={styles.btnDanger} onClick={handleBulkDelete} disabled={loading}>
                <Delete fontSize="small" /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colCheckbox}>
                  <input
                    type="checkbox" className={styles.checkbox}
                    checked={allChecked}
                    onChange={(e) =>
                      setSelectedSchoolIds(e.target.checked ? filteredSchools.map((s) => s.id) : [])
                    }
                  />
                </th>
                <th className={styles.colNo}>No.</th>
                <th className={styles.colName}>School Name</th>
                <th className={styles.colAddress}>Address</th>
                <th className={styles.colPhone}>Phone</th>
                <th className={styles.colDate}>Date</th>
                <th className={styles.colStatus}>Status</th>
                <th className={styles.colActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schoolsLoading ? (
                <tr className={styles.loadingRow}>
                  <td colSpan={8}>
                    <CircularProgress size={22} style={{ color: "#c8a96e" }} />
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🏫</div>
                      No schools found
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school, idx) => (
                  <tr
                    key={school.id}
                    className={selectedSchoolIds.includes(school.id) ? styles.rowSelected : ""}
                  >
                    {/* Checkbox */}
                    <td className={styles.colCheckbox}>
                      <input
                        type="checkbox" className={styles.checkbox}
                        checked={selectedSchoolIds.includes(school.id)}
                        onChange={(e) =>
                          setSelectedSchoolIds((p) =>
                            e.target.checked ? [...p, school.id] : p.filter((id) => id !== school.id)
                          )
                        }
                      />
                    </td>

                    {/* No */}
                    <td className={styles.colNo}>{idx + 1}</td>

                    {/* Name */}
                    <td className={styles.colName}>{school.name}</td>

                    {/* Address — truncated + popup */}
                    <td className={styles.colAddress}>
                      <div className={styles.addressCell}>
                        <span className={styles.addressText}>
                          {truncateAddress(school.address)}
                        </span>
                        <Tooltip title="View full address">
                          <button
                            className={styles.addressExpand}
                            onClick={() => setAddressPopup({ name: school.name, address: school.address })}
                          >
                            <LocationOn style={{ fontSize: "1rem" }} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className={styles.colPhone}>{school.phone}</td>

                    {/* Date */}
                    <td className={styles.colDate}>
                      {new Date(school.created_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className={styles.colStatus}>
                      {user?.role === "admin" ? (
                        <select
                          className={styles.statusSelect}
                          value={school.status}
                          disabled={statusUpdating === school.id}
                          onChange={(e) => handleStatusChange(school, e.target.value as StatusKey)}
                        >
                          <option value="new">New</option>
                          <option value="active">Active</option>
                          <option value="interested">Interested</option>
                          <option value="inactive">Inactive</option>
                          <option value="assigned">Assigned</option>
                          <option value="unassigned">Unassigned</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      ) : (
                        <select
                          className={styles.statusSelect}
                          value={school.status}
                          onChange={(e) => handleStatusChange(school, e.target.value as StatusKey)}
                        >
                          <option value="active">Active</option>
                          <option value="interested">Interested</option>
                          <option value="inactive">Inactive</option>
                          <option value="not_interested">Not Interested</option>
                        </select>
                      )}
                    </td>

                    {/* Actions */}
                    <td className={styles.colActions}>
                      <Tooltip title="Call">
                        <button className={`${styles.actionBtn} ${styles.call}`} onClick={() => callSchool(school.phone)}>
                          <Call style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>

                      <Tooltip title="WhatsApp">
                        <button className={`${styles.actionBtn} ${styles.whatsapp}`} onClick={() => openWhatsApp(school.phone)}>
                          <WhatsApp style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>

                      <Tooltip title="Notes">
                        <button
                          className={`${styles.actionBtn} ${styles.notes}`}
                          disabled={schoolsLoading}
                          onClick={() => { setNotesSchoolId(school.id); setNotesSchoolName(school.name); }}
                        >
                          <Badge badgeContent={noteCounts[school.id] || 0} color="primary"
                            sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", minWidth: "14px", height: "14px" } }}>
                            <NoteAdd style={{ fontSize: "0.95rem" }} />
                          </Badge>
                        </button>
                      </Tooltip>

                      {/* Delete always visible */}
                      <Tooltip title="Delete">
                        <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => handleDelete(school.id, school.name)}>
                          <Delete style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Address Popup ─────────────────────────────── */}
      {addressPopup && (
        <div className={styles.addressModal} onClick={() => setAddressPopup(null)}>
          <div className={styles.addressPopup} onClick={(e) => e.stopPropagation()}>
            <h4>{addressPopup.name}</h4>
            <p>{addressPopup.address}</p>
            <button className={styles.popupClose} onClick={() => setAddressPopup(null)}>
              <Close fontSize="small" />
            </button>
            <button className={styles.btnOutline} style={{ width: "100%" }}
              onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(addressPopup.address)}`, "_blank")}>
              <LocationOn fontSize="small" /> Open in Maps
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Dialog ─────────────────────────── */}
      <Dialog open={showForm} onClose={resetForm} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4" }}>
          {editingSchool ? "Edit School" : "Add New School"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ background: "#111827", pt: 2 }}>
            {["name", "address", "phone"].map((field) => (
              <TextField
                key={field}
                label={field.charAt(0).toUpperCase() + field.slice(1) + (field === "address" ? "" : "")}
                value={(formData as any)[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                required fullWidth margin="dense"
                multiline={field === "address"} rows={field === "address" ? 3 : 1}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "#f0ece4", background: "rgba(255,255,255,0.04)",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.09)" },
                    "&:hover fieldset": { borderColor: "rgba(200,169,110,0.35)" },
                    "&.Mui-focused fieldset": { borderColor: "#c8a96e" },
                  },
                  "& .MuiInputLabel-root": { color: "#6b7280" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#c8a96e" },
                }}
              />
            ))}
            <TextField
              select label="Status" value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              fullWidth margin="dense" SelectProps={{ native: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#f0ece4", background: "rgba(255,255,255,0.04)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.09)" },
                  "&:hover fieldset": { borderColor: "rgba(200,169,110,0.35)" },
                  "&.Mui-focused fieldset": { borderColor: "#c8a96e" },
                },
                "& .MuiInputLabel-root": { color: "#6b7280" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#c8a96e" },
                "& option": { background: "#1a2236" },
              }}
            >
              {user?.role === "admin" ? (
                <>
                  <option value="new">New</option>
                  <option value="active">Active</option>
                  <option value="interested">Interested</option>
                  <option value="inactive">Inactive</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="assigned">Assigned</option>
                </>
              ) : (
                <>
                  <option value="active">Active</option>
                  <option value="interested">Interested</option>
                  <option value="inactive">Inactive</option>
                </>
              )}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ background: "#1a2236", borderTop: "1px solid rgba(255,255,255,0.07)", px: 2, py: 1.2 }}>
            <button type="button" className={styles.btnOutline} onClick={resetForm}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : "Save School"}
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* assignment dialog removed – feature deprecated */}

      {/* ── Bulk Assignment Dialog ────────────────────── */}
      <Dialog open={showBulkModal} onClose={closeBulkModal} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4", display: "flex", alignItems: "center", gap: 1 }}>
          Bulk Assign — {selectedSchoolIds.length} school(s)
          {bulkLoading && <CircularProgress size={16} sx={{ color: "#c8a96e", ml: 1 }} />}
        </DialogTitle>
        <DialogContent sx={{ background: "#111827", p: "1.25rem 1.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: "1rem" }}>
            Schools are auto-marked <strong style={{ color: "#c084fc" }}>assigned</strong> when a user is added.
          </p>
          {allUsers.map((u) => (
            <div key={u.id} className={styles.userRow}>
              <div>
                <p className={styles.userName}>{u.name}</p>
                <p className={styles.userEmail}>{u.email}</p>
              </div>
              <input type="checkbox" className={styles.checkbox}
                checked={bulkAssignedUsers.includes(u.id)}
                onChange={() => handleBulkToggleUser(u.id)} />
            </div>
          ))}
        </DialogContent>
        <DialogActions sx={{ background: "#1a2236", borderTop: "1px solid rgba(255,255,255,0.07)", px: 2, py: 1.2 }}>
          <button className={styles.btnPrimary} onClick={closeBulkModal}>Done</button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────── */}
      <Dialog open={deleteModal.open} onClose={() => setDeleteModal({ open: false, type: 'single' })} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4" }}>
          Delete {deleteModal.type === 'bulk' ? 'Schools' : 'School'}?
        </DialogTitle>
        <DialogContent sx={{ background: "#111827", pt: 2, pb: 1 }}>
          <p style={{ color: "#f0ece4", marginBottom: "0.5rem" }}>
            {deleteModal.type === 'single'
              ? `Are you sure you want to delete "${deleteModal.schoolName}"?`
              : `Are you sure you want to delete ${selectedSchoolIds.length} school(s)?`}
          </p>
          <p style={{ fontSize: "0.82rem", color: "#ef4444" }}>
            This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ background: "#1a2236", borderTop: "1px solid rgba(255,255,255,0.07)", px: 2, py: 1.2 }}>
          <button className={styles.btnOutline} onClick={() => setDeleteModal({ open: false, type: 'single' })}>
            Cancel
          </button>
          <button 
            className={styles.btnDanger} 
            onClick={confirmDelete} 
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}