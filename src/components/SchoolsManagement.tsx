"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { School } from "@/lib/types";
import * as XLSX from "xlsx";
import { Delete, Edit, Add, WhatsApp, Call, NoteAdd } from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import NotesPanel from "@/components/NotesPanel";

interface ParsedSchool {
  name: string;
  address: string;
  phone: string;
}

export default function SchoolsManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notesSchoolId, setNotesSchoolId] = useState<string | null>(null);
  const [notesSchoolName, setNotesSchoolName] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (err) {
      console.error("Error fetching schools:", err);
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
            .insert(schoolsToInsert.map((s) => ({ ...s, status: "active" })));

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
          status: "active",
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
    });
  };

  const openWhatsApp = (phone: string) => {
    const message = "Hello! I'm contacting you regarding our school management.";
    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodedMessage}`,
      "_blank"
    );
  };

  const callSchool = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
        <h2>Schools Management</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn btn-secondary"
          >
            Upload Excel
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            <Add style={{ marginRight: "0.5rem" }} /> Add School
          </button>
        </div>
      </div>
      {notesSchoolId && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0 }}>Notes for {notesSchoolName}</h3>
            <button className="btn btn-secondary" onClick={() => setNotesSchoolId(null)}>Close</button>
          </div>
          <NotesPanel schoolId={notesSchoolId} schoolName={notesSchoolName} />
        </div>
      )}

      {message && (
        <div className={`alert ${message.includes("Error") ? "alert-danger" : "alert-success"}`}>
          {message}
        </div>
      )}

      {showUpload && (
        <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px" }}>
          <h3 style={{ marginBottom: "1rem" }}>Upload Schools from Excel</h3>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            Column names should be: School Name, Address, Phone Number
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={loading}
            style={{ marginBottom: "1rem" }}
          />
          <button
            onClick={() => setShowUpload(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }} className="card">
          <h3 style={{ marginBottom: "1rem" }}>
            {editingSchool ? "Edit School" : "Add New School"}
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label>School Name *</label>
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
            <label>Address *</label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
              style={{ width: "100%" }}
            />
          </div>

          {/* Status removed - DB default is used */}

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
        {schools.length === 0 ? (
          <p className="text-muted">No schools found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>School Name</th>
                <th>Address</th>
                <th>Phone</th>
                {/* Status column removed */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{school.address}</td>
                  <td>{school.phone}</td>
                  {/* status cell removed */}
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <IconButton
                        size="small"
                        onClick={() => callSchool(school.phone)}
                        title="Call"
                      >
                        <Call fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openWhatsApp(school.phone)}
                        title="WhatsApp"
                      >
                        <WhatsApp fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setNotesSchoolId(school.id);
                          setNotesSchoolName(school.name);
                        }}
                        title="Notes"
                      >
                        <NoteAdd fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(school)}
                        title="Edit"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(school.id)}
                        title="Delete"
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </div>
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
