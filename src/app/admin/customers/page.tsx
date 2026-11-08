"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  Search,
  Phone,
  Mail,
  Award,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 7;

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(
      `/api/customers?search=${encodeURIComponent(search)}&page=${page}&limit=${PAGE_SIZE}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.customers) setCustomers(data.customers);
        if (typeof data.total === "number") setTotal(data.total);
        if (typeof data.totalPages === "number") setTotalPages(data.totalPages);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const startRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-[#0F172A]">No Customers Found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Customer profiles are automatically established when appointments are booked.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Total Bookings</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">No-Shows</th>
                    <th className="py-3 px-4">Total Spent</th>
                    <th className="py-3 px-4">Loyalty Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center font-bold text-xs text-[#6D28D9]">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-[#0F172A] block">{c.name}</span>
                            {c.notes && (
                              <span className="text-[10px] text-[var(--text-muted)] italic">
                                "{c.notes}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A]">
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

                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {c.totalBookings}
                      </td>

                      <td className="py-3.5 px-4 text-[#15803D] font-semibold">
                        {c.completedBookings}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={c.noShows > 0 ? "text-[#B91C1C] font-bold" : "text-[#64748B]"}>
                          {c.noShows}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                        LKR {c.totalSpend.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[#D97706] font-bold text-[11px] border border-amber-500/20">
                          <Award className="w-3 h-3" />
                          <span>{c.loyaltyPoints} pts</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/60 text-xs">
              <div className="text-[var(--text-muted)] font-medium">
                Showing <span className="font-bold text-[#0F172A]">{startRecord}</span> to{" "}
                <span className="font-bold text-[#0F172A]">{endRecord}</span> of{" "}
                <span className="font-bold text-[#0F172A]">{total}</span> customers
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] font-semibold hover:bg-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 1
                    )
                    .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push("ellipsis");
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1.5 text-[var(--text-muted)] select-none"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          disabled={loading}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition-colors ${
                            page === item
                              ? "bg-[#8B5CF6] text-white shadow-sm"
                              : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] font-semibold hover:bg-[#F1F5F9] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
