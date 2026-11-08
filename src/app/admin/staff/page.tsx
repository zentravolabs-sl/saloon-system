"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Clock,
  CalendarOff,
  Scissors,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  X,
  Loader2,
  RotateCcw,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

export default function AdminStaffPage() {
  const { isApproved } = useSalonStatus();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchStaff = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/staff").then((res) => res.json()),
      fetch("/api/branches").then((res) => res.json()),
      fetch("/api/services").then((res) => res.json()),
    ])
      .then(([staffData, branchData, serviceData]) => {
        if (staffData.staff) setStaffList(staffData.staff);
        if (branchData.branches) setBranches(branchData.branches);
        if (serviceData.services) setServices(serviceData.services);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          specialization: specialization.trim() || undefined,
          branchIds: selectedBranchIds,
          serviceIds: selectedServiceIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create staff member");
      } else {
        setShowAddModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setSpecialization("");
        setSelectedBranchIds([]);
        setSelectedServiceIds([]);
        fetchStaff();
      }
    } catch {
      setError("Network error while creating staff");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchStaff();
    } catch {
      alert("Failed to update status");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Stylists & Barbers
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage your team members, service competencies, branch assignments, and schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/staff/schedules"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Schedules</span>
          </Link>
          <Link
            href="/admin/staff/leaves"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] transition-colors flex items-center gap-1.5"
          >
            <CalendarOff className="w-3.5 h-3.5" />
            <span>Staff Leaves</span>
          </Link>
          {isApproved ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stylist</span>
            </button>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Adding stylists is locked."
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#D97706]/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Add Stylist (Pending Approval)</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
          <span>Loading staff profiles...</span>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-3">
          <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[#0F172A]">No Stylists Found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Add team members to assign services and start generating booking slots.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((st) => (
            <div
              key={st.id}
              className="p-6 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-4 hover:border-[#E2E8F0] transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[#0F172A]">{st.name}</h3>
                      <p className="text-xs text-[#6D28D9] font-medium">{st.specialization}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      st.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-[#15803D] border-emerald-500/20"
                        : "bg-red-500/10 text-[#B91C1C] border-red-500/20"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {st.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{st.phone}</span>
                    </div>
                  )}
                  {st.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{st.email}</span>
                    </div>
                  )}
                </div>

                {/* Assigned branches */}
                <div className="pt-2 border-t border-[#E2E8F0] space-y-1 text-xs">
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">
                    Assigned Branches:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {st.branches?.map((sb: any) => (
                      <span
                        key={sb.branch.id}
                        className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[11px] text-[#334155]"
                      >
                        {sb.branch.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Assigned services count */}
                <div className="pt-1 text-xs text-[var(--text-muted)]">
                  Competent in:{" "}
                  <strong className="text-[#0F172A]">{st.services?.length || 0}</strong> services
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <Link
                  href="/admin/staff/schedules"
                  className="text-xs font-semibold text-[#6D28D9] hover:text-[#6D28D9]"
                >
                  Edit Schedule →
                </Link>

                <button
                  onClick={() => handleToggleStatus(st.id, st.status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    st.status === "ACTIVE"
                      ? "bg-red-500/10 text-[#B91C1C] border-red-500/20 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-[#15803D] border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  {st.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8B5CF6]" />
                Add New Stylist / Barber
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#B91C1C] text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Phone</label>
                  <input
                    type="tel"
                    placeholder="+9477..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Email</label>
                  <input
                    type="email"
                    placeholder="kasun@..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Master Barber & Hair Coloring"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
                />
              </div>

              {/* Branch assignments */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[var(--text-secondary)] font-medium">Assign Branches</label>
                <div className="grid grid-cols-2 gap-2">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranchIds([...selectedBranchIds, b.id]);
                          } else {
                            setSelectedBranchIds(selectedBranchIds.filter((id) => id !== b.id));
                          }
                        }}
                      />
                      <span className="text-xs text-[#0F172A]">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Service assignments */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[var(--text-secondary)] font-medium">
                  Compatible Services
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServiceIds([...selectedServiceIds, s.id]);
                          } else {
                            setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                          }
                        }}
                      />
                      <span className="text-[#0F172A] truncate">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {creating ? "Saving..." : "Add Stylist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
