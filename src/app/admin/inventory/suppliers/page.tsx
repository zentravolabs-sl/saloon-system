"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  Edit,
  Loader2,
  X,
  Check,
  Building2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  notes?: string;
  isActive: boolean;
  purchaseOrders?: Array<{ id: string; poNumber: string; totalAmount: number; status: string }>;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "Net 30",
    leadTimeDays: "3",
    notes: "",
    isActive: true,
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/suppliers");
      const data = await res.json();
      if (data.suppliers) setSuppliers(data.suppliers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      paymentTerms: "Net 30",
      leadTimeDays: "3",
      notes: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name,
      contactPerson: sup.contactPerson || "",
      email: sup.email || "",
      phone: sup.phone || "",
      address: sup.address || "",
      paymentTerms: sup.paymentTerms || "Net 30",
      leadTimeDays: String(sup.leadTimeDays || 3),
      notes: sup.notes || "",
      isActive: sup.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingSupplier
        ? `/api/inventory/suppliers/${editingSupplier.id}`
        : "/api/inventory/suppliers";
      const method = editingSupplier ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          leadTimeDays: Number(form.leadTimeDays),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save supplier");
      setShowModal(false);
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q))
      );
    });
  }, [suppliers, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#8B5CF6]" />
            Supplier Directory
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage your salon vendors, product distributors, contact persons, and purchasing terms.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/inventory/purchase-orders"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <span>View Purchase Orders</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[#0C0E1A] border border-white/10">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8B5CF6] mb-2" />
            Loading suppliers...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-[var(--text-muted)] bg-[#0C0E1A] rounded-2xl border border-white/10">
            No suppliers found. Click "Add Supplier" to register your distributors.
          </div>
        ) : (
          filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-5 rounded-2xl bg-[#0C0E1A] border border-white/10 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center text-[#A78BFA] font-bold text-sm">
                    {sup.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sup.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {sup.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <button
                      onClick={() => openEditModal(sup)}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">{sup.name}</h3>
                  {sup.contactPerson && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Contact: {sup.contactPerson}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                  {sup.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{sup.phone}</span>
                    </div>
                  )}
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="line-clamp-1">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span>Terms: <b className="text-white">{sup.paymentTerms || "Standard"}</b></span>
                <span>Lead Time: <b className="text-white">{sup.leadTimeDays || 3} days</b></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#8B5CF6]" />
                {editingSupplier ? "Edit Supplier" : "Add Supplier"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. L'Oreal Professional Sri Lanka"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Silva"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="077-1234567"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  placeholder="orders@supplier.lk"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Physical Address</label>
                <input
                  type="text"
                  placeholder="Warehouse address..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30, COD"
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-muted)] mb-1 font-semibold">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="3"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] mb-1 font-semibold">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Order instructions, minimum order quantities..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-[#8B5CF6]"
                />
                <label htmlFor="isActive" className="text-white cursor-pointer select-none">
                  Active supplier
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold"
                >
                  {submitting ? "Saving..." : editingSupplier ? "Update Supplier" : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
