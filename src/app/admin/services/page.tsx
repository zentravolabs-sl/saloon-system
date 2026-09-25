"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scissors,
  Plus,
  Clock,
  DollarSign,
  Users,
  FolderTree,
  X,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

export default function AdminServicesPage() {
  const { isApproved } = useSalonStatus();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Service Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(1500);
  const [duration, setDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(10);
  const [categoryId, setCategoryId] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
      fetch("/api/staff").then((res) => res.json()),
      fetch("/api/branches").then((res) => res.json()),
    ])
      .then(([serviceData, categoryData, staffData, branchData]) => {
        if (serviceData.services) setServices(serviceData.services);
        if (categoryData.categories) {
          setCategories(categoryData.categories);
          if (categoryData.categories.length > 0 && !categoryId) {
            setCategoryId(categoryData.categories[0].id);
          }
        }
        if (staffData.staff) setStaffList(staffData.staff);
        if (branchData.branches) {
          setBranches(branchData.branches);
          setSelectedBranchIds(branchData.branches.map((b: any) => b.id));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          price: Number(price),
          duration: Number(duration),
          bufferTime: Number(bufferTime),
          categoryId,
          staffIds: selectedStaffIds,
          branchIds: selectedBranchIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create service");
      } else {
        setShowModal(false);
        setName("");
        setDescription("");
        fetchData();
      }
    } catch {
      setError("Network error creating service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Services & Treatments
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure treatment durations, cleanup buffers, and assigned qualified stylists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/categories"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </Link>
          {isApproved ? (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          ) : (
            <button
              disabled
              title="Salon registration is pending Super Admin approval. Adding services is locked."
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Service (Pending Approval)</span>
            </button>
          )}
        </div>
      </div>

      {/* Services List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
          <span>Loading salon treatments...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <Scissors className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-white">No Services Found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Create your services to start accepting customer reservations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A78BFA] px-2 py-0.5 rounded bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                      {s.category?.name || "General"}
                    </span>
                    <h3 className="font-bold text-lg text-white mt-1.5">{s.name}</h3>
                  </div>
                  <span className="text-base font-black text-white">
                    LKR {s.price?.toLocaleString()}
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                    {s.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span>Duration: {s.duration}m</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>Buffer: {s.bufferTime}m</span>
                  </div>
                </div>

                {/* Assigned staff */}
                <div className="pt-2 border-t border-white/5 text-xs text-[var(--text-muted)]">
                  <span>
                    Assigned:{" "}
                    <strong className="text-white">
                      {s.assignedStaff?.length || 0}
                    </strong>{" "}
                    stylists
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
                <span className="text-[var(--text-muted)]">
                  Total Blocked: {s.duration + s.bufferTime} mins
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#8B5CF6]" />
                Add New Service / Treatment
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateService} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keratin Smooth Treatment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#111827]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Price (LKR) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">
                    Buffer Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Service details, included washes, styling tips..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none resize-none"
                />
              </div>

              {/* Assign stylists */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-[var(--text-secondary)] font-medium">
                  Assign Qualified Stylists
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {staffList.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(st.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStaffIds([...selectedStaffIds, st.id]);
                          } else {
                            setSelectedStaffIds(selectedStaffIds.filter((id) => id !== st.id));
                          }
                        }}
                      />
                      <span className="text-white truncate">{st.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
