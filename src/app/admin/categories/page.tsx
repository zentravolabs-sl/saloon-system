"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  ChevronLeft,
  X,
  Loader2,
  Scissors,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useSalonStatus } from "@/context/SalonStatusContext";

export default function AdminCategoriesPage() {
  const { isApproved } = useSalonStatus();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Category modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = () => {
    setLoading(true);
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create category");
      } else {
        setShowModal(false);
        setName("");
        setDescription("");
        fetchCategories();
      }
    } catch {
      setError("Network error creating category");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/services"
              className="text-xs text-[var(--text-muted)] hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Services</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Service Categories
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Organize services into clear customer-facing categories (e.g. Hair, Beard, Facial, Treatments).
          </p>
        </div>

        {isApproved ? (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        ) : (
          <button
            disabled
            title="Salon registration is pending Super Admin approval. Adding categories is locked."
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-amber-300/80 border border-amber-500/20 cursor-not-allowed flex items-center gap-1.5 opacity-80"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Category (Pending Approval)</span>
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
          <span>Loading categories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{c.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-[var(--text-muted)]">
                  {c._count?.services || 0} services
                </span>
              </div>
              {c.description && (
                <p className="text-xs text-[var(--text-muted)]">{c.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0C0E1A] border border-white/10 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#8B5CF6]" />
                Add Category
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

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spa & Massage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--text-secondary)] font-medium">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Body care, head massage, aromatherapy"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none"
                />
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
                  {submitting ? "Saving..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
