"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Scissors,
  Plus,
  Clock,
  Users,
  FolderTree,
  X,
  Loader2,
  CheckCircle2,
  Lock,
  Package,
  Trash2,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

interface ServiceProductRow {
  productId: string;
  productName?: string;
  unit?: string;
  quantity: number;
}

export default function AdminServicesPage() {
  const { isApproved } = useSalonStatus();
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
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

  // Products Used Modal
  const [activeServiceForProducts, setActiveServiceForProducts] = useState<any | null>(null);
  const [productsUsedRows, setProductsUsedRows] = useState<ServiceProductRow[]>([]);
  const [savingProductsUsed, setSavingProductsUsed] = useState(false);
  const [productsUsedError, setProductsUsedError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
      fetch("/api/staff").then((res) => res.json()),
      fetch("/api/branches").then((res) => res.json()),
      fetch("/api/inventory/products").then((res) => (res.ok ? res.json() : { items: [] })),
    ])
      .then(([serviceData, categoryData, staffData, branchData, invData]) => {
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
        if (invData.items) {
          setInventoryProducts(invData.items);
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

  const openProductsUsedModal = (service: any) => {
    setActiveServiceForProducts(service);
    setProductsUsedError("");
    const existing: ServiceProductRow[] = (service.productsUsed || []).map((p: any) => ({
      productId: p.productId,
      productName: p.productName,
      unit: p.unit,
      quantity: Number(p.quantity) || 1,
    }));
    setProductsUsedRows(existing);
  };

  const addProductUsedRow = () => {
    const unusedProduct = inventoryProducts.find(
      (p) => !productsUsedRows.some((r) => r.productId === p.id)
    );
    if (!unusedProduct) return;
    setProductsUsedRows([
      ...productsUsedRows,
      {
        productId: unusedProduct.id,
        productName: unusedProduct.name,
        unit: unusedProduct.unit,
        quantity: 1,
      },
    ]);
  };

  const updateProductUsedRow = (index: number, patch: Partial<ServiceProductRow>) => {
    setProductsUsedRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const updated = { ...row, ...patch };
        if (patch.productId) {
          const found = inventoryProducts.find((p) => p.id === patch.productId);
          if (found) {
            updated.productName = found.name;
            updated.unit = found.unit;
          }
        }
        return updated;
      })
    );
  };

  const removeProductUsedRow = (index: number) => {
    setProductsUsedRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProductsUsed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServiceForProducts) return;
    setProductsUsedError("");
    setSavingProductsUsed(true);

    try {
      const validItems = productsUsedRows
        .filter((r) => r.productId && Number(r.quantity) > 0)
        .map((r) => ({
          productId: r.productId,
          quantity: Number(r.quantity),
        }));

      const res = await fetch("/api/inventory/service-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: activeServiceForProducts.id,
          items: validItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProductsUsedError(data.error || "Failed to save products used");
      } else {
        setActiveServiceForProducts(null);
        fetchData();
      }
    } catch {
      setProductsUsedError("Network error saving products used");
    } finally {
      setSavingProductsUsed(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            Services & Treatments
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure treatment durations, assigned stylists, and products used per service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/categories"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] transition-colors flex items-center gap-1.5"
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
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] text-[#D97706]/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
            >
              <Lock className="w-3.5 h-3.5 text-[#D97706]" />
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
        <div className="p-8 text-center rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] space-y-3">
          <Scissors className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-base font-bold text-[#0F172A]">No Services Found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Create your services to start accepting customer reservations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {services.map((s) => {
            const productsUsed: any[] = s.productsUsed || [];
            return (
              <div
                key={s.id}
                className="group relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_rgba(139,92,246,0.12)] border border-[#E2E8F0] hover:border-[#8B5CF6]/40 hover:-translate-y-0.5 transition-all duration-200 space-y-3.5 flex flex-col justify-between min-w-0"
              >
                {/* Subtle top accent bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] opacity-80 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-3 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] uppercase tracking-wider font-bold text-[#6D28D9] px-2.5 py-0.5 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 truncate max-w-full">
                        {s.category?.name || "General"}
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-[#0F172A] group-hover:text-[#6D28D9] transition-colors mt-1.5 break-words leading-snug">
                        {s.name}
                      </h3>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap">
                      Rs. {s.price?.toLocaleString()}
                    </span>
                  </div>

                  {s.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {s.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] pt-1">
                    <div className="flex items-center gap-1.5 min-w-0 px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/80">
                      <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                      <span className="truncate font-medium">{s.duration}m</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/80">
                      <Clock className="w-3.5 h-3.5 text-[#EC4899] shrink-0" />
                      <span className="truncate font-medium">+{s.bufferTime}m buf</span>
                    </div>
                  </div>

                  {/* Assigned staff */}
                  <div className="pt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Users className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <span>
                      Assigned:{" "}
                      <strong className="text-[#0F172A]">
                        {s.assignedStaff?.length || 0}
                      </strong>{" "}
                      stylists
                    </span>
                  </div>

                  {/* Products Used summary */}
                  <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#475569] flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-[#8B5CF6]" />
                        Products Used
                      </span>
                      <button
                        type="button"
                        onClick={() => openProductsUsedModal(s)}
                        className="text-[11px] font-bold text-[#6D28D9] hover:text-[#5B21B6] px-2 py-0.5 rounded-lg bg-[#F5F3FF] hover:bg-[#EDE9FE] transition-colors"
                      >
                        {productsUsed.length > 0 ? "Edit" : "+ Configure"}
                      </button>
                    </div>
                    {productsUsed.length === 0 ? (
                      <p className="text-[11px] text-[#94A3B8]">
                        No automatic stock deduction configured
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {productsUsed.map((pu) => (
                          <div
                            key={pu.productId}
                            className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]/70"
                          >
                            <span className="font-medium text-[#0F172A] truncate pr-2">
                              {pu.productName}
                            </span>
                            <span className="font-bold text-[#6D28D9] shrink-0">
                              {pu.quantity} {pu.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#15803D] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    Active
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Total: {s.duration + s.bufferTime} mins
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Products Used Configuration Modal */}
      {activeServiceForProducts && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#8B5CF6]" />
                  Products Used — {activeServiceForProducts.name}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  These products will be automatically deducted from stock when an appointment for this service is completed.
                </p>
              </div>
              <button
                onClick={() => setActiveServiceForProducts(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {productsUsedError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#B91C1C] text-xs">
                {productsUsedError}
              </div>
            )}

            <form onSubmit={handleSaveProductsUsed} className="space-y-4 text-xs">
              {inventoryProducts.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center space-y-2">
                  <p className="text-[#475569] font-medium">
                    No inventory products found yet.
                  </p>
                  <Link
                    href="/admin/inventory"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6] text-white font-bold text-xs"
                  >
                    Go to Inventory to Add Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {productsUsedRows.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-center text-[#64748B]">
                      No products added yet. Click <strong>+ Add Product Used</strong> below.
                    </div>
                  ) : (
                    productsUsedRows.map((row, index) => {
                      const selectedProd = inventoryProducts.find(
                        (p) => p.id === row.productId
                      );
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                        >
                          <div className="flex-1 min-w-0">
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                              Product
                            </label>
                            <select
                              value={row.productId}
                              onChange={(e) =>
                                updateProductUsedRow(index, { productId: e.target.value })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] font-medium focus:outline-none focus:border-[#8B5CF6]"
                            >
                              {inventoryProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-28">
                            <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                              Quantity ({selectedProd?.unit || row.unit || "units"})
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              required
                              value={row.quantity}
                              onChange={(e) =>
                                updateProductUsedRow(index, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] font-bold focus:outline-none focus:border-[#8B5CF6]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeProductUsedRow(index)}
                            className="mt-4 p-2 rounded-lg text-[#EF4444] hover:bg-red-50 transition-colors"
                            title="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}

                  {productsUsedRows.length < inventoryProducts.length && (
                    <button
                      type="button"
                      onClick={addProductUsedRow}
                      className="w-full py-2 rounded-xl border border-dashed border-[#8B5CF6]/40 text-[#6D28D9] font-bold hover:bg-[#F5F3FF] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Product Used</span>
                    </button>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveServiceForProducts(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProductsUsed}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md disabled:opacity-50"
                >
                  {savingProductsUsed ? "Saving..." : "Save Products Used"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[#8B5CF6]" />
                Add New Service / Treatment
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateService} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keratin Smooth Treatment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white text-[#0F172A]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] font-medium">
                    Duration (Minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] focus:outline-none resize-none"
                />
              </div>

              {/* Assign stylists */}
              <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <label className="text-[var(--text-secondary)] font-medium">
                  Assign Qualified Stylists
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {staffList.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] cursor-pointer text-[11px]"
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
                      <span className="text-[#0F172A] truncate">{st.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A]"
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
