"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch(`/api/super-admin/users?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-rose-500/10 text-[#B91C1C] border-rose-500/20",
    SALON_OWNER: "bg-amber-500/10 text-[#D97706] border-amber-500/20",
    MANAGER: "bg-purple-500/10 text-[#6D28D9] border-purple-500/20",
    RECEPTIONIST: "bg-blue-500/10 text-[#1D4ED8] border-blue-500/20",
    STAFF: "bg-cyan-500/10 text-[#0284C7] border-cyan-500/20",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Platform Users & Access
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            All registered administrators, salon owners, and staff accounts.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#D97706]" />
            <span>Loading system accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No users match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Salon Affiliation</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      {u.name}
                    </td>

                    <td className="py-3.5 px-4 text-[#0F172A]">
                      <div>
                        <span>{u.email}</span>
                        {u.phone && (
                          <span className="text-[11px] text-[var(--text-muted)] block">
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          roleColors[u.role] || "bg-[#F8FAFC] text-[#0F172A]"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                      {u.salonName}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-muted)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[#15803D] font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
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
