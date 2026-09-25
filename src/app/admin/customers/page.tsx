"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertTriangle,
  Award,
  Loader2,
  RotateCcw,
} from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = () => {
    setLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) setCustomers(data.customers);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Customer CRM Directory
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Track client spending, completed appointments, no-show history, and loyalty rewards.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-white">No Customers Found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Customer profiles are automatically established when appointments are booked.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.01] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Total Bookings</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">No-Shows</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Loyalty Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center font-bold text-xs text-[#A78BFA]">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{c.name}</span>
                          {c.notes && (
                            <span className="text-[10px] text-[var(--text-muted)] italic">
                              "{c.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-white">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                            <Mail className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-white">
                      {c.totalBookings}
                    </td>

                    <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                      {c.completedBookings}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={c.noShows > 0 ? "text-red-400 font-bold" : "text-white/40"}>
                        {c.noShows}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      LKR {c.totalSpend.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold text-[11px] border border-amber-500/20">
                        <Award className="w-3 h-3" />
                        <span>{c.loyaltyPoints} pts</span>
                      </div>
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
