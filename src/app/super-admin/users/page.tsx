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
    SUPER_ADMIN: "bg-rose-500/10 text-rose-300 border-rose-500/20",
    SALON_OWNER: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    MANAGER: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    RECEPTIONIST: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    STAFF: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
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
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
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
                <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Salon Affiliation</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {u.name}
                    </td>

                    <td className="py-3.5 px-4 text-white">
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
                          roleColors[u.role] || "bg-white/10 text-white"
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
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
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
