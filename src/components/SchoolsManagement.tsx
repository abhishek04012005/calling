"use client";

import React, { useState, useEffect } from "react";
import styles from "./SchoolsManagement.module.css";
import { createClient } from "@/lib/supabase";
import { School, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import * as XLSX from "xlsx";
import {
  Delete,
  Edit,
  Add,
  WhatsApp,
  Call,
  NoteAdd,
  GroupAdd,
  GroupRemove,
} from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";

// new MUI imports
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  InputAdornment,
  Chip,
  Alert,
} from "@mui/material";
import NotesPanel from "@/components/NotesPanel";

interface ParsedSchool {
  name: string;
  address: string;
  phone: string;
}

export default function SchoolsManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentSchool, setAssignmentSchool] = useState<School | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAssignedUsers, setBulkAssignedUsers] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    status: "new",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notesSchoolId, setNotesSchoolId] = useState<string | null>(null);
  const [notesSchoolName, setNotesSchoolName] = useState<string>("");
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const { user } = useAuth();

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    fetchSchools();
    if (user.role === "admin") {
      fetchAllUsers();
    }
  }, [user]);

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("name", { ascending: true });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchSchools = async () => {
    if (!user) {
      // nothing to load until we know who is logged in
      setSchools([]);
      return;
    }

    setSchoolsLoading(true);
    try {
      let query = supabase.from("schools").select("*");

      // If user is not admin, only fetch assigned schools or phone-matching records
      if (user.role !== "admin") {
        const { data: assignments, error: assignError } = await supabase
          .from("user_school_assignments")
          .select("school_id")
          .eq("user_id", user.id);

        if (assignError) throw assignError;
        const assignedSchoolIds = assignments?.map((a: { school_id: string; }) => a.school_id) || [];

        // build filter string: include phone condition if assigned_number is set
        if (assignedSchoolIds.length === 0 && !user.assigned_number) {
          setSchools([]);
          setSchoolsLoading(false);
          return;
        }

        if (user.assigned_number) {
          const phoneVal = user.assigned_number.replace(/'/g, "''");
          if (assignedSchoolIds.length > 0) {
            query = query.or(
              `id.in.(${assignedSchoolIds.join(",")}),phone.eq.${phoneVal}`
            );
          } else {
            query = query.eq("phone", phoneVal);
          }
        } else {
          query = query.in("id", assignedSchoolIds);
        }
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      const schoolList: School[] = data || [];
      setSchools(schoolList);

      // count notes for each school
      const counts: Record<string, number> = {};
      for (const s of schoolList) {
        const { count, error: cntErr } = await supabase
          .from("notes")
          .select("id", { head: true, count: "exact" })
          .eq("school_id", s.id);
        if (cntErr) {
          console.error("Error counting notes for", s.id, cntErr);
          counts[s.id] = 0;
        } else {
          counts[s.id] = count || 0;
        }
      }
      setNoteCounts(counts);
    } catch (err) {
      console.error("Error fetching schools:", err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Parse and validate the data (normalize phone, keep only required fields)
          const parsedSchools: ParsedSchool[] = jsonData
            .map((row: any) => {
              const rawPhone = row["Phone Number"] || row["phone"] || "";
              const phone = String(rawPhone).trim();
              return {
                name: row["School Name"] || row["name"] || "",
                address: row["Address"] || row["address"] || "",
                phone,
              };
            })
            .filter((school) => school.name && school.address && school.phone);

          if (parsedSchools.length === 0) {
            throw new Error(
              "No valid data found. Please ensure columns are named: School Name, Address, Phone Number"
            );
          }

          // Fetch existing phone numbers from database
          const { data: existingSchools, error: fetchError } = await supabase
            .from("schools")
            .select("phone");

          if (fetchError) throw fetchError;

          const existingPhones = new Set(existingSchools?.map((s: { phone: any; }) => s.phone) || []);

          // Filter out schools with duplicate phone numbers
          const schoolsToInsert: ParsedSchool[] = [];
          const duplicatePhones: string[] = [];

          parsedSchools.forEach((school) => {
            if (existingPhones.has(school.phone)) {
              duplicatePhones.push(school.phone);
            } else {
              schoolsToInsert.push(school);
              existingPhones.add(school.phone); // Add to set to prevent duplicates within batch
            }
          });

          if (schoolsToInsert.length === 0) {
            throw new Error("All phone numbers already exist in the database");
          }

          // Insert only schools with unique phone numbers. Set valid status to satisfy DB constraint.
          const { error: insertError } = await supabase
            .from("schools")
            .insert(schoolsToInsert.map((s) => ({ ...s, status: "new" })));

          if (insertError) throw insertError;

          let successMessage = `Successfully uploaded ${schoolsToInsert.length} schools`;
          if (duplicatePhones.length > 0) {
            successMessage += `. Skipped ${duplicatePhones.length} duplicate phone number(s).`;
          }

          setMessage(successMessage);
          setShowUpload(false);
          await fetchSchools();
        } catch (err: any) {
          setMessage(`Error parsing file: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (editingSchool) {
        const { error } = await supabase
          .from("schools")
          .update({
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            status: formData.status || editingSchool.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSchool.id);

        if (error) throw error;
        setMessage("School updated successfully");
      } else {
        const { error } = await supabase.from("schools").insert({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          status: formData.status || "new",
        });

        if (error) throw error;
        setMessage("School created successfully");
      }

      resetForm();
      await fetchSchools();
    } catch (err) {
      setMessage("Error saving school");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (schoolId: string) => {
    if (!confirm("Are you sure you want to delete this school?")) return;

    try {
      const { error } = await supabase
        .from("schools")
        .delete()
        .eq("id", schoolId);

      if (error) throw error;
      setMessage("School deleted successfully");
      await fetchSchools();
    } catch (err) {
      setMessage("Error deleting school");
      console.error(err);
    }
  };



  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      address: school.address,
      phone: school.phone,
      status: school.status as string,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSchool(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      status: user?.role === "admin" ? "new" : "active",
    });
  };

  const openWhatsApp = (phone: string) => {
    const message = "Hello! I'm contacting you regarding our school management.";
    const encodedMessage = encodeURIComponent(message);
    // ensure we include country code 91 if not already present
    let digits = phone.replace(/[^0-9]/g, "");
    if (!digits.startsWith("91")) {
      digits = `91${digits}`;
    }
    window.open(
      `https://wa.me/${digits}?text=${encodedMessage}`,
      "_blank"
    );
  };

  const callSchool = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const openAssignmentModal = async (school: School) => {
    if (!school || !school.id) {
      console.error("openAssignmentModal called with invalid school", school);
      return;
    }

    setAssignmentSchool(school);
    setAssignmentLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_school_assignments")
        .select("user_id")
        .eq("school_id", school.id);

      // log both for debugging and only treat as error if it has details
      if (error) {
        if (error.message || error.code) {
          console.error(
            "Supabase returned an error fetching assignments",
            JSON.stringify(error, null, 2)
          );
          throw error;
        } else {
          console.warn("Supabase returned an empty error object", error);
          // continue as if no error occurred
        }
      }

      const userIds = data?.map((d: { user_id: string; }) => d.user_id) || [];
      setAssignedUsers(userIds);
      setShowAssignmentModal(true);
    } catch (err: any) {
      // handle missing table specially
      if (err?.code === "PGRST205") {
        setMessage(
          "Assignments functionality is not available. Please create the `user_school_assignments` table in the database."
        );
      } else {
        console.error("Error fetching assignments:",
          err instanceof Error ? err.message : JSON.stringify(err));
        setMessage("Error loading assignments");
      }
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleToggleUser = async (userId: string) => {
    if (!assignmentSchool) return;

    const isAssigned = assignedUsers.includes(userId);

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from("user_school_assignments")
          .delete()
          .eq("user_id", userId)
          .eq("school_id", assignmentSchool.id);

        if (error) throw error;
        setAssignedUsers((prev) => prev.filter((id) => id !== userId));
        setMessage("User unassigned successfully");

        // Check if school has any remaining assignments
        const { data: remainingAssignments, error: checkError } = await supabase
          .from("user_school_assignments")
          .select("id")
          .eq("school_id", assignmentSchool.id)
          .limit(1);

        if (!checkError && (!remainingAssignments || remainingAssignments.length === 0)) {
          // No more assignments, change status back to "unassigned"
          const { error: statusError } = await supabase
            .from("schools")
            .update({ status: "unassigned", updated_at: new Date().toISOString() })
            .eq("id", assignmentSchool.id);
          if (!statusError) {
            setSchools((prev) =>
              prev.map((s) => (s.id === assignmentSchool.id ? { ...s, status: "unassigned" } : s))
            );
          }
        }
      } else {
        const { error } = await supabase
          .from("user_school_assignments")
          .insert({
            user_id: userId,
            school_id: assignmentSchool.id,
            assigned_by: user?.id,
          });

        if (error) throw error;
        setAssignedUsers((prev) => [...prev, userId]);
        setMessage("User assigned successfully");

        // Auto-update school status to "assigned"
        const { error: updateError } = await supabase
          .from("schools")
          .update({ status: "assigned" })
          .eq("id", assignmentSchool.id);
        if (updateError) {
          console.error("Error updating school status", updateError);
        } else {
          // update local state so UI reflects change immediately
          setSchools((prev) =>
            prev.map((s) => (s.id === assignmentSchool.id ? { ...s, status: "assigned" } : s))
          );
        }
      }
    } catch (err) {
      console.error("Error updating assignment:", err);
      setMessage("Error updating assignment");
    }
  };

  const closeAssignmentModal = async () => {
    setShowAssignmentModal(false);
    setAssignmentSchool(null);
    setAssignedUsers([]);
    await fetchSchools();
  };

  const handleBulkToggleUser = async (userId: string) => {
    if (selectedSchoolIds.length === 0) return;

    const isAllAssigned = bulkAssignedUsers.includes(userId);
    try {
      if (isAllAssigned) {
        const { error } = await supabase
          .from("user_school_assignments")
          .delete()
          .eq("user_id", userId)
          .in("school_id", selectedSchoolIds);
        if (error) throw error;
        setBulkAssignedUsers((prev) => prev.filter((id) => id !== userId));
        setMessage("User unassigned from selected schools");
      } else {
        // prepare bulk inserts for each unassigned combination
        const toInsert: any[] = selectedSchoolIds.map((sid) => ({
          user_id: userId,
          school_id: sid,
          assigned_by: user?.id,
        }));
        const { error } = await supabase
          .from("user_school_assignments")
          .insert(toInsert);
        if (error) throw error;
        setBulkAssignedUsers((prev) => [...prev, userId]);
        setMessage("User assigned to selected schools");

        // Auto-update all selected schools to "assigned" status
        const { error: updateError } = await supabase
          .from("schools")
          .update({ status: "assigned" })
          .in("id", selectedSchoolIds);
        if (updateError) {
          console.error("Error updating schools status", updateError);
        } else {
          setSchools((prev) =>
            prev.map((s) => (selectedSchoolIds.includes(s.id) ? { ...s, status: "assigned" } : s))
          );
        }
      }
    } catch (err) {
      console.error("Error updating bulk assignment", err);
      setMessage("Error updating assignments");
    }
  };

  const closeBulkModal = async () => {
    setShowBulkModal(false);
    setBulkAssignedUsers([]);
    setSelectedSchoolIds([]);
    await fetchSchools();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedSchoolIds.length} school(s)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("schools")
        .delete()
        .in("id", selectedSchoolIds);

      if (error) throw error;
      setMessage(`Successfully deleted ${selectedSchoolIds.length} school(s)`);
      setSelectedSchoolIds([]);
      await fetchSchools();
    } catch (err) {
      setMessage("Error deleting selected schools");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnassignAll = async () => {
    if (!confirm(`Are you sure you want to unassign all users from ${selectedSchoolIds.length} selected school(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_school_assignments")
        .delete()
        .in("school_id", selectedSchoolIds);

      if (error) throw error;
      setMessage("All users unassigned from selected schools");

      // Update school status back to "unassigned" since no assignments remain
      const { error: statusError } = await supabase
        .from("schools")
        .update({ status: "unassigned", updated_at: new Date().toISOString() })
        .in("id", selectedSchoolIds);

      if (!statusError) {
        setSchools((prev) =>
          prev.map((s) => (selectedSchoolIds.includes(s.id) ? { ...s, status: "unassigned" } : s))
        );
      }

      await fetchSchools();
    } catch (err) {
      setMessage("Error unassigning users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "new":
        return { backgroundColor: "#ffeb3b", color: "#000", fontWeight: 600 };
      case "active":
        return { backgroundColor: "#4caf50", color: "#fff", fontWeight: 600 };
      case "interested":
        return { backgroundColor: "#2196f3", color: "#fff", fontWeight: 600 };
      case "assigned":
        return { backgroundColor: "#9c27b0", color: "#fff", fontWeight: 600 };
      case "inactive":
        return { backgroundColor: "#9e9e9e", color: "#fff", fontWeight: 600 };
      case "unassigned":
        return { backgroundColor: "#607d8b", color: "#fff", fontWeight: 600 };
      case "not_interested":
        return { backgroundColor: "#f44336", color: "#fff", fontWeight: 600 };
      default:
        return {};
    }
  };

  const statusClass = (status: string) => {
    switch (status) {
      case "new":
        return styles.statusNew;
      case "active":
        return styles.statusActive;
      case "interested":
        return styles.statusInterested;
      case "assigned":
        return styles.statusAssigned;
      case "inactive":
        return styles.statusInactive;
      case "unassigned":
        return styles.statusUnassigned;
      case "not_interested":
        return styles.statusNotInterested;
      default:
        return "";
    }
  };

  const filteredSchools = schools
    .filter((s) => {
      const matchesName = s.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter ? s.status === statusFilter : true;
      return matchesName && matchesStatus;
    });

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
        <h2>Schools Management</h2>
        <div className={styles.actions}>
          {user?.role === "admin" && (
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setShowForm(true)}
            >
              Add School
            </Button>
          )}
          {user?.role === "admin" && (
            <Button
              variant="outlined"
              onClick={() => setShowUpload(!showUpload)}
            >
              Upload Excel
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert
          severity={message.includes("Error") ? "error" : "success"}
          style={{ marginBottom: "1rem" }}
        >
          {message}
        </Alert>
      )}

      {schoolsLoading && (
        <div className="text-center" style={{ marginBottom: "1rem" }}>
          <CircularProgress size={24} />
        </div>
      )}

      {notesSchoolId && (
        <NotesPanel
          schoolId={notesSchoolId}
          schoolName={notesSchoolName}
          onClose={() => {
            setNotesSchoolId(null);
            setNotesSchoolName("");
            // await fetchSchools(); // removed to prevent excessive refreshing
          }}
          onNoteCountChange={(count) => {
            setNoteCounts((prev) => ({
              ...prev,
              [notesSchoolId]: count,
            }));
          }}
        />
      )}

      {showUpload && (
        <Paper className={styles.uploadPanel} elevation={2}>
          <h3>Upload Schools from Excel</h3>
          <p className="text-muted">
            Column names should be: School Name, Address, Phone Number
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            style={{ marginBottom: "1rem" }}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setShowUpload(false)}
          >
            Cancel
          </Button>
        </Paper>
      )}

      {/* search & status filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <TextField
          label="Search schools"
          variant="outlined"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1 }}
        />
        <TextField
          select
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: "150px" }}
          SelectProps={{ native: true }}
        >
          <option value="">All</option>
          <option value="new">new</option>
          <option value="active">active</option>
          <option value="interested">interested</option>
          <option value="inactive">inactive</option>
          <option value="unassigned">unassigned</option>
          <option value="assigned">assigned</option>
        </TextField>
      </div>

      {/* bulk action bar */}
      {selectedSchoolIds.length > 0 && (
        <Paper
          style={{ padding: "0.5rem", marginBottom: "1rem" }}
          elevation={1}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{selectedSchoolIds.length} school(s) selected</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {user?.role === "admin" ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<GroupAdd />}
                    onClick={async () => {
                      // open bulk user assignment
                      setShowBulkModal(true);
                      setBulkLoading(true);
                      try {
                        const { data, error } = await supabase
                          .from("user_school_assignments")
                          .select("user_id, school_id")
                          .in("school_id", selectedSchoolIds);
                        if (error && error.code !== "PGRST205") throw error;
                        // build map counts
                        const countMap: Record<string, number> = {};
                        (data || []).forEach((row: any) => {
                          countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
                        });
                        const usersAll = allUsers.filter(
                          (u) => countMap[u.id] === selectedSchoolIds.length
                        );
                        setBulkAssignedUsers(usersAll.map((u) => u.id));
                      } catch (err: any) {
                        if (err?.code === "PGRST205") {
                          setMessage(
                            "Assignments functionality is not available. Please create the `user_school_assignments` table in the database."
                          );
                        } else {
                          console.error("Error loading bulk assignments", err);
                          setMessage("Error loading assignments");
                        }
                      } finally {
                        setBulkLoading(false);
                      }
                    }}
                  >
                    Assign users to selected
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<GroupRemove />}
                    onClick={handleBulkUnassignAll}
                    disabled={loading}
                  >
                    Unassign all from selected
                  </Button>
                </>
              ) : null}
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
              >
                Delete selected
              </Button>
            </div>
          </div>
        </Paper>
      )}

      <TableContainer component={Paper} className={styles.tableWrapper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={
                    selectedSchoolIds.length > 0 &&
                    selectedSchoolIds.length === filteredSchools.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSchoolIds(filteredSchools.map((s) => s.id));
                    } else {
                      setSelectedSchoolIds([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>No.</TableCell>
              <TableCell>School Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell className="date-column">Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {schoolsLoading ? "" : "No schools found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSchools.map((school, index) => (
                <TableRow key={school.id} hover>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSchoolIds.includes(school.id)}
                      onChange={(e) => {
                        setSelectedSchoolIds((prev) => {
                          if (e.target.checked) {
                            return [...prev, school.id];
                          } else {
                            return prev.filter((id) => id !== school.id);
                          }
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{school.name}</TableCell>
                  <TableCell>{school.address}</TableCell>
                  <TableCell>{school.phone}</TableCell>
                  <TableCell>
                    {new Date(school.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user?.role === "admin" ? (
                      <TextField
                        select
                        value={school.status}
                        onChange={async (e) => {
                          const val = e.target.value as
                            | "new"
                            | "active"
                            | "interested"
                            | "inactive"
                            | "unassigned"
                            | "assigned"
                            | "not_interested";

                          if (statusUpdating === school.id) return; // prevent multiple updates

                          setStatusUpdating(school.id);
                          const prevStatus = school.status;

                          // optimistic UI update
                          setSchools((prev) =>
                            prev.map((s) =>
                              s.id === school.id ? { ...s, status: val } : s
                            )
                          );

                          try {
                            const { error } = await supabase
                              .from("schools")
                              .update({ status: val, updated_at: new Date().toISOString() })
                              .eq("id", school.id);

                            if (error) {
                              // revert optimistic change
                              setSchools((prev) =>
                                prev.map((s) =>
                                  s.id === school.id ? { ...s, status: prevStatus } : s
                                )
                              );
                              const errMsg =
                                (error && (error.message || error.code)) ||
                                (Object.keys(error || {}).length === 0 ? "(no details)" : JSON.stringify(error));
                              console.error("Error updating status", errMsg);
                              setMessage(
                                `Error updating status: ${errMsg}. If this mentions a constraint or invalid value, update your DB schema (see DATABASE_SCHEMA.md) and ensure 'status' allows the chosen value.`
                              );
                              return;
                            }

                            // success: optimistic update is already done, DB updated
                          } catch (err) {
                            setSchools((prev) =>
                              prev.map((s) =>
                                s.id === school.id ? { ...s, status: prevStatus } : s
                              )
                            );
                            console.error("Error updating status", err);
                            setMessage("Error updating status");
                          } finally {
                            setStatusUpdating(null);
                          }
                        }}
                        size="small"
                        variant="outlined"
                        SelectProps={{ native: true }}
                        InputProps={{ style: statusStyle(school.status) }}
                        disabled={statusUpdating === school.id}

                      >
                        <option className={styles.statusSelect}
                          value="new">new</option>
                        <option className={styles.statusSelect} value="active">active</option>
                        <option className={styles.statusSelect} value="interested">interested</option>
                        <option className={styles.statusSelect} value="inactive">inactive</option>
                        <option className={styles.statusSelect} value="assigned">assigned</option>
                        <option className={styles.statusSelect} value="unassigned">unassigned</option>
                        <option className={styles.statusSelect} value="not_interested">not interested</option>
                      </TextField>
                    ) : (
                      // allow normal users to change select as well
                      <TextField
                        select
                        value={school.status}
                        onChange={async (e) => {
                          const val = e.target.value as
                            | "active"
                            | "interested"
                            | "inactive"
                            | "not_interested";
                          const prevStatus = school.status;
                          // optimistic update
                          setSchools((prev) =>
                            prev.map((s) =>
                              s.id === school.id ? { ...s, status: val } : s
                            )
                          );
                          try {
                            const { error } = await supabase
                              .from("schools")
                              .update({ status: val })
                              .eq("id", school.id);
                            if (error) {
                              setSchools((prev) =>
                                prev.map((s) =>
                                  s.id === school.id ? { ...s, status: prevStatus } : s
                                )
                              );
                            }
                          } catch {
                            setSchools((prev) =>
                              prev.map((s) =>
                                s.id === school.id ? { ...s, status: prevStatus } : s
                              )
                            );
                          }
                        }}
                        size="small"
                        variant="outlined"
                        SelectProps={{ native: true }}
                        InputProps={{ style: statusStyle(school.status) }}
                      >
                        <option className={styles.statusSelect} value="active">active</option>
                        <option className={styles.statusSelect} value="interested">interested</option>
                        <option className={styles.statusSelect} value="inactive">inactive</option>
                        <option className={styles.statusSelect} value="not_interested">not interested</option>
                      </TextField>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Call">
                      <IconButton
                        size="small"
                        onClick={() => callSchool(school.phone)}
                      >
                        <Call fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="WhatsApp">
                      <IconButton
                        size="small"
                        onClick={() => openWhatsApp(school.phone)}
                      >
                        <WhatsApp fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Notes">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (!schoolsLoading) {
                            setNotesSchoolId(school.id);
                            setNotesSchoolName(school.name);
                          }
                        }}
                        disabled={schoolsLoading}
                      >
                        <Badge
                          badgeContent={noteCounts[school.id] || 0}
                          color="primary"
                        >
                          <NoteAdd fontSize="small" />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    {user?.role === "admin" && (
                      <>
                        <Tooltip title="Assign users">
                          <IconButton
                            size="small"
                            onClick={() => openAssignmentModal(school)}
                          >
                            <GroupAdd fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        {school.status !== "assigned" && (
                          <>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(school.id)}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form dialog */}

      {/* Form dialog */}
      <Dialog open={showForm} onClose={resetForm} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
          <DialogContent>
            <TextField
              label="School Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              margin="dense"
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              fullWidth
              margin="dense"
              multiline
              rows={3}
            />
            <TextField
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              fullWidth
              margin="dense"
            />
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              fullWidth
              margin="dense"
              SelectProps={{ native: true }}
              className={styles.statusSelect}
            >
              {user?.role === "admin" ? (
                <>
                  <option className={styles.statusSelect} value="new">new</option>
                  <option value="active">active</option>
                  <option value="interested">interested</option>
                  <option value="inactive">inactive</option>
                  <option value="unassigned">unassigned</option>
                  <option value="assigned">assigned</option>
                </>
              ) : (
                <>
                  <option value="active">active</option>
                  <option value="interested">interested</option>
                  <option value="inactive">inactive</option>
                </>
              )}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Assignment dialog */}
      <Dialog
        open={showAssignmentModal}
        onClose={closeAssignmentModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Assign Users to "{assignmentSchool?.name}" 
          {assignmentSchool && (
            <Chip 
              label={assignmentSchool.status} 
              size="small" 
              className={statusClass(assignmentSchool.status)}
              style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
            />
          )}
          {assignmentLoading && (
            <CircularProgress size={20} style={{ marginLeft: "0.5rem" }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {assignmentSchool?.status === "unassigned" && (
            <Alert severity="info" style={{ marginBottom: "1rem" }}>
              This school is currently unassigned. Assign users below to change its status.
            </Alert>
          )}
          {allUsers.length === 0 ? (
            <p className="text-muted">No users available for assignment</p>
          ) : (
            allUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{u.name}</p>
                  <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>
                    {u.email}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={assignedUsers.includes(u.id)}
                  onChange={() => handleToggleUser(u.id)}
                />
              </div>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAssignmentModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk assignment dialog */}
      <Dialog
        open={showBulkModal}
        onClose={closeBulkModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Assign Users to {selectedSchoolIds.length} selected school(s){" "}
          {bulkLoading && (
            <CircularProgress size={20} style={{ marginLeft: "0.5rem" }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" style={{ marginBottom: "1rem" }}>
            Assign users to the selected schools. Schools will automatically be marked as "assigned" when users are assigned.
          </Alert>
          {allUsers.length === 0 ? (
            <p className="text-muted">No users available for assignment</p>
          ) : (
            allUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.5rem 0",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{u.name}</p>
                  <p style={{ margin: "0.25rem 0 0 0", color: "#666" }}>
                    {u.email}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={bulkAssignedUsers.includes(u.id)}
                  onChange={() => handleBulkToggleUser(u.id)}
                />
              </div>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
