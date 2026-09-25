"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";

export default function SuperAdminSalonsPage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSalons = () => {
    setLoading(true);
    let url = `/api/super-admin/salons?`;
    if (statusFilter) url += `status=${statusFilter}&`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.salons) setSalons(data.salons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSalons();
  }, [statusFilter]);

  const handleUpdateStatus = async (salonId: string, status: string, reason?: string) => {
    setActionLoading(salonId);
    try {
      const res = await fetch(`/api/super-admin/salons/${salonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });

      if (res.ok) {
        fetchSalons();
      } else {
        alert("Failed to update status");
      }
    } catch {
      alert("Error updating salon status");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = salons.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.owner?.name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Salon Directory & Tenants
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Review, approve, activate, or suspend salon subscriptions and tenant instances.
          </p>
        </div>

        <button
          onClick={fetchSalons}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 self-start sm:self-auto"
          title="Refresh"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by salon name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none w-full sm:w-auto"
        >
          <option value="" className="bg-[#111827]">All Statuses</option>
          <option value="APPROVED" className="bg-[#111827]">Approved</option>
          <option value="PENDING" className="bg-[#111827]">Pending Review</option>
          <option value="SUSPENDED" className="bg-[#111827]">Suspended</option>
          <option value="REJECTED" className="bg-[#111827]">Rejected</option>
        </select>
      </div>

      {/* Salons Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>Loading salons...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No salons match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Salon</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Branches</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{s.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{s.city}</span>
                    </td>

                    <td className="py-3.5 px-4 text-white font-medium">
                      {s.owner?.name}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      <span>{s.phone || s.owner?.phone}</span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {s._count?.branches || 0}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {s._count?.staff || 0}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-amber-300 border border-white/10">
                        {s.subscription?.plan || "TRIAL"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : s.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {actionLoading === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400 inline-block" />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Rejection reason:") || "Incomplete details";
                                  handleUpdateStatus(s.id, "REJECTED", reason);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[11px] font-bold border border-red-500/30"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {s.status === "APPROVED" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "SUSPENDED")}
                              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 font-semibold text-[11px]"
                            >
                              Suspend
                            </button>
                          )}

                          {s.status === "SUSPENDED" && (
                            <button
                              onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-semibold text-[11px]"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
