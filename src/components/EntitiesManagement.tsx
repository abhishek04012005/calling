"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./EntitiesManagement.module.css";
import { createClient } from "@/lib/supabase";
import { Entity, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import { ENTITY_TYPES, CURRENT_ENTITY_TYPE } from "@/lib/config";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
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
  UploadFile,
  LocationOn,
  CheckCircleOutline,
  ErrorOutline,
  SchoolOutlined,
  PaletteOutlined,
  BuildOutlined,
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
interface ParsedEntity {
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
export default function EntitiesManagement() {
  const [entities, setEntities]               = useState<Entity[]>([]);
  const [noteCounts, setNoteCounts]         = useState<Record<string, number>>({});
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [hasEntityTypeColumn, setHasEntityTypeColumn] = useState<boolean>(false);
  const [totalCount, setTotalCount]         = useState<number>(0);
  const [currentPage, setCurrentPage]       = useState<number>(1);
  const [itemsPerPage, setItemsPerPage]     = useState<number>(20);

  const effectiveItemsPerPage = itemsPerPage === -1 ? totalCount || 1 : itemsPerPage;
  const totalPages = effectiveItemsPerPage > 0 ? Math.max(1, Math.ceil(totalCount / effectiveItemsPerPage)) : 1;
  const displayStart = totalCount === 0 ? 0 : (currentPage - 1) * effectiveItemsPerPage + 1;
  const displayEnd = totalCount === 0 ? 0 : Math.min(currentPage * effectiveItemsPerPage, totalCount);
  const [showUpload, setShowUpload]         = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [editingEntity, setEditingEntity]   = useState<Entity | null>(null);
  const [searchText, setSearchText]         = useState("");
  const [statusFilter, setStatusFilter]     = useState<string>("");

  // Assignment-related data (used for bulk assignments)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  // note: assignedUsers state removed since assignment UI gone

  // Bulk
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
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
  const [notesEntityId, setNotesEntityId]     = useState<string | null>(null);
  const [notesEntityName, setNotesEntityName] = useState<string>("");

  // Status update guard
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Address popup
  const [addressPopup, setAddressPopup] = useState<{ name: string; address: string } | null>(null);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'single' | 'bulk'; entityId?: string; entityName?: string }>(
    { open: false, type: 'single' }
  );

  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const entityConfig = ENTITY_TYPES[CURRENT_ENTITY_TYPE];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'SchoolOutlined': return <SchoolOutlined fontSize="small" />;
      case 'PaletteOutlined': return <PaletteOutlined fontSize="small" />;
      case 'BuildOutlined': return <BuildOutlined fontSize="small" />;
      default: return <SchoolOutlined fontSize="small" />;
    }
  };

  /* ── Auto-dismiss message ─────────────────────────── */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  /* ── Data fetches ─────────────────────────────────── */
  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users").select("*").eq("role", "user").order("name", { ascending: true });
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [supabase]);

  const fetchEntities = useCallback(async (page: number = currentPage, perPage: number = itemsPerPage) => {
    if (!user) { setEntities([]); return; }
    setEntitiesLoading(true);
    try {
      // Check if entity_type column exists
      if (!hasEntityTypeColumn) {
        try {
          const { error } = await supabase.from("schools").select("entity_type").limit(1);
          if (!error) {
            setHasEntityTypeColumn(true);
          }
        } catch {
          // Column doesn't exist, keep hasEntityTypeColumn as false
        }
      }

      let countQuery = supabase.from("schools").select("*", { count: "exact", head: true });
      let dataQuery = supabase.from("schools").select("*");

      // Apply entity_type filtering to both queries if column exists
      if (hasEntityTypeColumn) {
        if (CURRENT_ENTITY_TYPE !== 'school') {
          countQuery = countQuery.eq("entity_type", CURRENT_ENTITY_TYPE);
          dataQuery = dataQuery.eq("entity_type", CURRENT_ENTITY_TYPE);
        } else {
          countQuery = countQuery.or(`entity_type.eq.school,entity_type.is.null`);
          dataQuery = dataQuery.or(`entity_type.eq.school,entity_type.is.null`);
        }
      }

      // Apply user filtering to both queries
      if (user.role !== "admin") {
        try {
          const { data: assignments, error: assignError } = await supabase
            .from("user_school_assignments").select("school_id").eq("user_id", user.id);
          if (assignError) {
            console.error("Error fetching user assignments:", assignError);
          } else {
            const assignedIds = assignments?.map((a: { school_id: string }) => a.school_id) || [];

            if (assignedIds.length === 0 && !user.assigned_number) {
              setEntities([]); setTotalCount(0); setEntitiesLoading(false); return;
            }
            
            if (user.assigned_number) {
              const phoneVal = user.assigned_number.replace(/'/g, "''");
              const filterCondition = assignedIds.length > 0
                ? `id.in.(${assignedIds.join(",")}),phone.eq.${phoneVal}`
                : `phone.eq.${phoneVal}`;
              countQuery = countQuery.or(filterCondition);
              dataQuery = dataQuery.or(filterCondition);
            } else {
              countQuery = countQuery.in("id", assignedIds);
              dataQuery = dataQuery.in("id", assignedIds);
            }
          }
        } catch (assignErr) {
          console.error("Error in user assignment filtering:", assignErr);
        }
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const currentTotal = count || 0;
      setTotalCount(currentTotal);

      // Get paginated data
      const fetchAllRows = perPage === -1;
      const pageSize = fetchAllRows ? currentTotal : perPage;

      // Different sorting for admin vs user
      const sortField = user.role === "admin" ? "created_at" : "name";
      const sortAscending = user.role === "admin" ? false : true;
      const dataQueryWithOrder = dataQuery.order(sortField, { ascending: sortAscending });
      const queryResult = fetchAllRows
        ? await dataQueryWithOrder
        : await dataQueryWithOrder.range((page - 1) * pageSize, (page * pageSize) - 1);

      const { data, error } = queryResult;
      if (error) throw error;
      const entityList: Entity[] = data || [];
      setEntities(entityList);

      // Re-enable note counting with error handling
      const counts: Record<string, number> = {};
      for (const s of entityList) {
        try {
          const { count, error: countError } = await supabase
            .from("notes").select("id", { head: true, count: "exact" }).eq("school_id", s.id);
          if (countError) {
            console.warn(`Error counting notes for entity ${s.id}:`, countError);
            counts[s.id] = 0;
          } else {
            counts[s.id] = count || 0;
          }
        } catch (countErr) {
          console.warn(`Error counting notes for entity ${s.id}:`, countErr);
          counts[s.id] = 0;
        }
      }
      setNoteCounts(counts);
    } catch (err) {
      console.error("Error fetching entities:", err);
      if (err && typeof err === 'object') {
        console.error("Error details:", {
          message: (err as any).message,
          code: (err as any).code,
          details: (err as any).details,
          hint: (err as any).hint,
        });
      }
      setMessage(`Error loading ${entityConfig.plural.toLowerCase()}. Please check the console for details.`);
    } finally {
      setEntitiesLoading(false);
    }
  }, [user, hasEntityTypeColumn, currentPage, itemsPerPage, supabase, entityConfig.plural]);

  /* ── Init ─────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    fetchEntities(currentPage, itemsPerPage);
    if (user.role === "admin") fetchAllUsers();
  }, [user, currentPage, itemsPerPage, fetchAllUsers, fetchEntities]);

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
          const parsed: ParsedEntity[] = (rows as any[])
            .map((r) => ({
              name:    r[entityConfig.excelColumns[0]] || r["name"] || "",
              address: r[entityConfig.excelColumns[1]] || r["address"] || "",
              phone:   String(r[entityConfig.excelColumns[2]] || r["phone"] || "").trim(),
            }))
            .filter((e) => e.name && e.address && e.phone);

          if (!parsed.length) throw new Error(`No valid data. Columns: ${entityConfig.excelColumns.join(", ")}`);

          // Check for duplicates - only filter by entity_type if column exists
          let duplicateQuery = supabase.from("schools").select("phone");
          if (hasEntityTypeColumn) {
            duplicateQuery = duplicateQuery.eq("entity_type", CURRENT_ENTITY_TYPE);
          }
          const { data: existing } = await duplicateQuery;
          const existPhones = new Set(existing?.map((e: any) => e.phone) || []);
          const toInsert: ParsedEntity[] = [];
          const dupes: string[] = [];
          parsed.forEach((e) => {
            if (existPhones.has(e.phone)) { dupes.push(e.phone); }
            else { toInsert.push(e); existPhones.add(e.phone); }
          });

          if (!toInsert.length) throw new Error("All phone numbers already exist");
          
          // Prepare insert data - only include entity_type if column exists
          const insertData = toInsert.map((e) => {
            const baseData = { 
              name: e.name, 
              address: e.address, 
              phone: e.phone, 
              status: "new" as const 
            };
            return hasEntityTypeColumn ? { ...baseData, entity_type: CURRENT_ENTITY_TYPE } : baseData;
          });
          
          const { error: ins } = await supabase.from("schools").insert(insertData);
          if (ins) throw ins;

          setMessage(`Uploaded ${toInsert.length} ${entityConfig.label.toLowerCase()}(s)${dupes.length ? `. Skipped ${dupes.length} duplicate(s).` : "."}`);
          setShowUpload(false);
          await fetchEntities(currentPage, itemsPerPage);
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
      if (editingEntity) {
        const { error } = await supabase.from("schools").update({
          name: formData.name, address: formData.address,
          phone: formData.phone, status: formData.status || editingEntity.status,
          updated_at: new Date().toISOString(),
        }).eq("id", editingEntity.id);
        if (error) throw error;
        setMessage(`${entityConfig.label} updated successfully`);
      } else {
        // Prepare insert data - only include entity_type if column exists
        const insertData = {
          name: formData.name, 
          address: formData.address,
          phone: formData.phone, 
          status: formData.status || "new",
        };
        const finalInsertData = hasEntityTypeColumn ? { ...insertData, entity_type: CURRENT_ENTITY_TYPE } : insertData;
        
        const { error } = await supabase.from("schools").insert(finalInsertData);
        if (error) throw error;
        setMessage(`${entityConfig.label} created successfully`);
      }
      resetForm(); await fetchEntities(currentPage, itemsPerPage);
    } catch (err) {
      setMessage(`Error saving ${entityConfig.label.toLowerCase()}`); console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entityId: string, entityName: string) => {
    setDeleteModal({ open: true, type: 'single', entityId, entityName });
  };


  const resetForm = () => {
    setShowForm(false); setEditingEntity(null);
    setFormData({ name: "", address: "", phone: "", status: user?.role === "admin" ? "new" : "active" });
  };

  /* ── Contact actions ──────────────────────────────── */
  const openWhatsApp = (phone: string) => {
    let digits = phone.replace(/[^0-9]/g, "");
    if (!digits.startsWith("91")) digits = `91${digits}`;
    const message = entityConfig.whatsappMessage || "Hello! I'm contacting you.";
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank");
  };
  const callEntity = (phone: string) => { window.location.href = `tel:${phone}`; };

  /* assignment modal logic removed - feature no longer used */

  /* ── Bulk actions ─────────────────────────────────── */
  const handleBulkToggleUser = async (userId: string) => {
    if (!selectedEntityIds.length) return;
    const isAll = bulkAssignedUsers.includes(userId);
    try {
      if (isAll) {
        const { error } = await supabase.from("user_school_assignments")
          .delete().eq("user_id", userId).in("school_id", selectedEntityIds);
        if (error) throw error;
        setBulkAssignedUsers((p) => p.filter((id) => id !== userId));
      } else {
        const { error } = await supabase.from("user_school_assignments")
          .insert(selectedEntityIds.map((sid) => ({ user_id: userId, school_id: sid, assigned_by: user?.id })));
        if (error) throw error;
        setBulkAssignedUsers((p) => [...p, userId]);
        await supabase.from("schools").update({ status: "assigned" }).in("id", selectedEntityIds);
        setEntities((p) => p.map((s) => selectedEntityIds.includes(s.id) ? { ...s, status: "assigned" } : s));
      }
    } catch (err) {
      setMessage("Error updating bulk assignment"); console.error(err);
    }
  };

  const closeBulkModal = async () => {
    setShowBulkModal(false); setBulkAssignedUsers([]); setSelectedEntityIds([]);
    await fetchEntities(currentPage, itemsPerPage);
  };

  const handleBulkDelete = async () => {
    setDeleteModal({ open: true, type: 'bulk' });
  };

  /* ── Confirmed delete ──────────────────────────────── */
  const confirmDelete = async () => {
    setLoading(true);
    try {
      if (deleteModal.type === 'single' && deleteModal.entityId) {
        const { error } = await supabase.from("schools").delete().eq("id", deleteModal.entityId);
        if (error) throw error;
        setMessage(`${entityConfig.label} deleted successfully`);
      } else if (deleteModal.type === 'bulk') {
        const { error } = await supabase.from("schools").delete().in("id", selectedEntityIds);
        if (error) throw error;
        setMessage(`Deleted ${selectedEntityIds.length} ${entityConfig.label.toLowerCase()}(s)`);
        setSelectedEntityIds([]);
      }
      setDeleteModal({ open: false, type: 'single' });
      await fetchEntities(currentPage, itemsPerPage);
    } catch (err) {
      setMessage(`Error deleting ${entityConfig.label.toLowerCase()}(s)`); console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnassignAll = async () => {
    if (!confirm(`Unassign all users from ${selectedEntityIds.length} ${entityConfig.label.toLowerCase()}(s)?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("user_school_assignments")
        .delete().in("school_id", selectedEntityIds);
      if (error) throw error;
      await supabase.from("schools")
        .update({ status: "unassigned", updated_at: new Date().toISOString() })
        .in("id", selectedEntityIds);
      setEntities((p) => p.map((e) => selectedEntityIds.includes(e.id) ? { ...e, status: "unassigned" } : e));
      setMessage("Unassigned all users from selected entities");
      await fetchEntities(currentPage, itemsPerPage);
    } catch (err) {
      setMessage("Error unassigning users"); console.error(err);
    } finally { setLoading(false); }
  };

  /* ── Status inline update ─────────────────────────── */
  const handleStatusChange = async (entity: Entity, val: StatusKey) => {
    if (statusUpdating === entity.id) return;
    setStatusUpdating(entity.id);
    const prev = entity.status;
    setEntities((p) => p.map((s) => s.id === entity.id ? { ...s, status: val } : s));
    try {
      const { error } = await supabase.from("schools")
        .update({ status: val, updated_at: new Date().toISOString() }).eq("id", entity.id);
      if (error) {
        setEntities((p) => p.map((s) => s.id === entity.id ? { ...s, status: prev } : s));
        setMessage("Error updating status");
      }
    } catch {
      setEntities((p) => p.map((s) => s.id === entity.id ? { ...s, status: prev } : s));
      setMessage("Error updating status");
    } finally {
      setStatusUpdating(null);
    }
  };

  /* ── Filtered list ────────────────────────────────── */
  const filteredEntities = entities.filter((s) => {
    const matchesName   = s.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter ? s.status === statusFilter : true;
    return matchesName && matchesStatus;
  });

  const allChecked =
    filteredEntities.length > 0 && selectedEntityIds.length === filteredEntities.length;

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}>
              {getIcon(entityConfig.icon)}
            </div>
            <h2 className={styles.pageTitle}>Data Management</h2>
          </div>

          <div className={styles.headerActions}>
            {user?.role === "admin" && (
              <>
                <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
                  <Add fontSize="small" /> Add Data
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
            <h3>Upload Data from Excel</h3>
            {/* <p>Columns required: <strong>{entityConfig.excelColumns.join('</strong>, <strong>')}</strong></p> */}
            <p>Columns required: Name, Address, Phone Number</p>
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
        {notesEntityId && (
          <NotesPanel
            entityId={notesEntityId}
            entityName={notesEntityName}
            onClose={() => { setNotesEntityId(null); setNotesEntityName(""); }}
            onNoteCountChange={(count) =>
              setNoteCounts((p) => ({ ...p, [notesEntityId]: count }))
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
              placeholder="Search"
            />
          </div>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            {user?.role === "admin" ? (
              <>
                <option value="new">New</option>
                <option value="active">Active</option>
                <option value="interested">Interested</option>
                <option value="inactive">Inactive</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
                <option value="not_interested">Not Interested</option>
                <option value="not_recieved">Not Received</option>
              </>
            ) : (
              <>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="not_interested">Not Interested</option>
                <option value="not_recieved">Not Received</option>
              </>
            )}
          </select>
        </div>

        {/* Bulk bar */}
        {selectedEntityIds.length > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{selectedEntityIds.length} selected</span>
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
                          .in("school_id", selectedEntityIds);
                        const countMap: Record<string, number> = {};
                        (data || []).forEach((r: any) => {
                          countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
                        });
                        setBulkAssignedUsers(
                          allUsers.filter((u) => countMap[u.id] === selectedEntityIds.length).map((u) => u.id)
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
                      setSelectedEntityIds(e.target.checked ? filteredEntities.map((e) => e.id) : [])
                    }
                  />
                </th>
                <th className={styles.colNo}>No.</th>
                <th className={styles.colName}>Name</th>
                <th className={styles.colAddress}>Address</th>
                <th className={styles.colPhone}>Phone</th>
                <th className={styles.colDate}>Date</th>
                <th className={styles.colStatus}>Status</th>
                <th className={styles.colActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entitiesLoading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      No Data found
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntities.map((entity, idx) => (
                  <tr
                    key={entity.id}
                    className={selectedEntityIds.includes(entity.id) ? styles.rowSelected : ""}
                  >
                    {/* Checkbox */}
                    <td className={styles.colCheckbox}>
                      <input
                        type="checkbox" className={styles.checkbox}
                        checked={selectedEntityIds.includes(entity.id)}
                        onChange={(e) =>
                          setSelectedEntityIds((p) =>
                            e.target.checked ? [...p, entity.id] : p.filter((id) => id !== entity.id)
                          )
                        }
                      />
                    </td>

                    {/* No */}
                    <td className={styles.colNo}>{(currentPage - 1) * effectiveItemsPerPage + idx + 1}</td>

                    {/* Name */}
                    <td className={styles.colName}>{entity.name}</td>

                    {/* Address — truncated + popup */}
                    <td className={styles.colAddress}>
                      <div className={styles.addressCell}>
                        <span className={styles.addressText}>
                          {truncateAddress(entity.address)}
                        </span>
                        <Tooltip title="View full address">
                          <button
                            className={styles.addressExpand}
                            onClick={() => setAddressPopup({ name: entity.name, address: entity.address })}
                          >
                            <LocationOn style={{ fontSize: "1rem" }} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className={styles.colPhone}>{entity.phone}</td>

                    {/* Date */}
                    <td className={styles.colDate}>
                      {new Date(entity.created_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className={styles.colStatus}>
                      {user?.role === "admin" ? (
                        <select
                          className={styles.statusSelect}
                          value={entity.status}
                          disabled={statusUpdating === entity.id}
                          onChange={(e) => handleStatusChange(entity, e.target.value as StatusKey)}
                        >
                          <option value="new">New</option>
                          <option value="active">Active</option>
                          <option value="interested">Interested</option>
                          <option value="inactive">Inactive</option>
                          <option value="assigned">Assigned</option>
                          <option value="unassigned">Unassigned</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="not_recieved">Not Received</option>
                        </select>
                      ) : (
                        <select
                          className={styles.statusSelect}
                          value={entity.status}
                          onChange={(e) => handleStatusChange(entity, e.target.value as StatusKey)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="not_interested">Not Interested</option>
                          <option value="not_recieved">Not Received</option>
                        </select>
                      )}
                    </td>

                    {/* Actions */}
                    <td className={styles.colActions}>
                      <Tooltip title="Call">
                        <button className={`${styles.actionBtn} ${styles.call}`} onClick={() => callEntity(entity.phone)}>
                          <Call style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>

                      <Tooltip title="WhatsApp">
                        <button className={`${styles.actionBtn} ${styles.whatsapp}`} onClick={() => openWhatsApp(entity.phone)}>
                          <WhatsApp style={{ fontSize: "0.95rem" }} />
                        </button>
                      </Tooltip>

                      <Tooltip title="Notes">
                        <button
                          className={`${styles.actionBtn} ${styles.notes}`}
                          disabled={entitiesLoading}
                          onClick={() => { setNotesEntityId(entity.id); setNotesEntityName(entity.name); }}
                        >
                          <Badge badgeContent={noteCounts[entity.id] || 0} color="primary"
                            sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", minWidth: "14px", height: "14px" } }}>
                            <NoteAdd style={{ fontSize: "0.95rem" }} />
                          </Badge>
                        </button>
                      </Tooltip>

                      {/* Delete always visible */}
                      <Tooltip title="Delete">
                        <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => handleDelete(entity.id, entity.name)}>
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

        {/* Pagination */}
        {totalCount > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationControls}>
              <div className={styles.itemsPerPage}>
                <label htmlFor="itemsPerPage">Show:</label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newPerPage = Number(e.target.value);
                    setItemsPerPage(newPerPage);
                    setCurrentPage(1); // Reset to first page
                    fetchEntities(1, newPerPage);
                  }}
                  className={styles.perPageSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>All</option>
                </select>
              </div>

              <div className={styles.pageInfo}>
                Showing {displayStart} to {displayEnd} of {totalCount} entries
              </div>

              <div className={styles.pageButtons}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    fetchEntities(newPage, itemsPerPage);
                  }}
                >
                  Previous
                </button>

                <span className={styles.pageNumber}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    const newPage = Math.min(currentPage + 1, totalPages);
                    setCurrentPage(newPage);
                    fetchEntities(newPage, itemsPerPage);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Address Popup (Dialog) ────────────────────────── */}
      <Dialog open={!!addressPopup} onClose={() => setAddressPopup(null)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4", display: "flex", alignItems: "center", gap: 1 }}>
          <LocationOn fontSize="small" sx={{ color: "#c8a96e" }} />
          {addressPopup?.name}
        </DialogTitle>
        <DialogContent sx={{ background: "#111827", pt: 2, pb: 1 }}>
          <p style={{ color: "#f0ece4", fontSize: "0.95rem", lineHeight: "1.6", margin: "0 0 1rem" }}>
            {addressPopup?.address}
          </p>
        </DialogContent>
        <DialogActions sx={{ background: "#1a2236", borderTop: "1px solid rgba(255,255,255,0.07)", px: 2, py: 1.2 }}>
          <button className={styles.btnOutline} onClick={() => setAddressPopup(null)}>
            Close
          </button>
          <button className={styles.btnPrimary} 
            onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(addressPopup?.address || "")}`, "_blank")}>
            <LocationOn style={{ fontSize: "0.9rem" }} /> Open Maps
          </button>
        </DialogActions>
      </Dialog>

      {/* ── Add / Edit Dialog ─────────────────────────── */}
      <Dialog open={showForm} onClose={resetForm} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4" }}>
          {editingEntity ? `Edit ${entityConfig.label}` : `Add New ${entityConfig.label}`}
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
                  <option value="not_interested">Not Interested</option>
                  <option value="not_recieved">Not Received</option>
                </>
              ) : (
                <>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="not_recieved">Not Received</option>
                </>
              )}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ background: "#1a2236", borderTop: "1px solid rgba(255,255,255,0.07)", px: 2, py: 1.2 }}>
            <button type="button" className={styles.btnOutline} onClick={resetForm}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? "Saving…" : `Save ${entityConfig.label}`}
            </button>
          </DialogActions>
        </form>
      </Dialog>

      {/* assignment dialog removed – feature deprecated */}

      {/* ── Bulk Assignment Dialog ────────────────────── */}
      <Dialog open={showBulkModal} onClose={closeBulkModal} fullWidth maxWidth="sm"
        PaperProps={{ sx: { background: "#111827", color: "#f0ece4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px" } }}>
        <DialogTitle sx={{ fontFamily: "'Playfair Display', serif", background: "#1a2236", borderBottom: "1px solid rgba(255,255,255,0.07)", color: "#f0ece4", display: "flex", alignItems: "center", gap: 1 }}>
          Bulk Assign — {selectedEntityIds.length} {entityConfig.label.toLowerCase()}(s)
          {bulkLoading && <CircularProgress size={16} sx={{ color: "#c8a96e", ml: 1 }} />}
        </DialogTitle>
        <DialogContent sx={{ background: "#111827", p: "1.25rem 1.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "#9ca3af", marginBottom: "1rem" }}>
            {entityConfig.plural} are auto-marked <strong style={{ color: "#c084fc" }}>assigned</strong> when a user is added.
          </p>
          {allUsers.map((u) => (
            <div key={u.id} className={styles.userRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
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
          Delete {deleteModal.type === 'bulk' ? entityConfig.plural : entityConfig.label}?
        </DialogTitle>
        <DialogContent sx={{ background: "#111827", pt: 2, pb: 1 }}>
          <p style={{ color: "#f0ece4", marginBottom: "0.5rem" }}>
            {deleteModal.type === 'single'
              ? `Are you sure you want to delete "${deleteModal.entityName}"?`
              : `Are you sure you want to delete ${selectedEntityIds.length} ${entityConfig.label.toLowerCase()}(s)?`}
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