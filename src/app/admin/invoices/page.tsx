"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Printer,
  X,
  Loader2,
  Calendar,
  DollarSign,
  User,
  Scissors,
} from "lucide-react";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchInvoices = () => {
    setLoading(true);
    fetch(`/api/invoices?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) setInvoices(data.invoices);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [search]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
            Invoices & Billing
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Automatically generated billing invoices for completed client services.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
            <span>Loading billing invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Receipt className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-[#0F172A]">No Invoices Found</p>
            <p className="text-xs text-[var(--text-muted)]">
              Invoices are automatically created when appointments are marked as COMPLETED.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.04)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Subtotal</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F1F5F9] shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0F172A]">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0F172A] block">
                        {inv.booking?.customer?.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {inv.booking?.customer?.phone}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                      {new Date(inv.issuedAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-[#0F172A]">
                      LKR {inv.subtotal?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-[#15803D]">
                      {inv.discountAmount > 0
                        ? `-LKR ${inv.discountAmount?.toLocaleString()}`
                        : "—"}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                      LKR {inv.totalAmount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[#15803D] border border-emerald-500/20">
                        PAID
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A] font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 space-y-6 animate-scaleIn text-[#0F172A] print:bg-white print:text-black">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {selectedInvoice.invoiceNumber}
                </span>
                <h3 className="text-xl font-bold text-[#0F172A]">Tax Invoice</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#6D28D9] print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block uppercase font-semibold">
                  Billed To:
                </span>
                <p className="font-bold text-[#0F172A] text-sm">
                  {selectedInvoice.booking?.customer?.name}
                </p>
                <p className="text-[var(--text-muted)]">
                  {selectedInvoice.booking?.customer?.phone}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[var(--text-muted)] block uppercase font-semibold">
                  Issued Date:
                </span>
                <p className="font-bold text-[#0F172A]">
                  {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                </p>
                <p className="text-[var(--text-muted)]">
                  Ref: {selectedInvoice.booking?.reference}
                </p>
              </div>
            </div>

            {/* Services table */}
            <div className="border-t border-[#E2E8F0] pt-4 space-y-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Services Rendered:
              </span>
              {selectedInvoice.booking?.services?.map((bs: any) => (
                <div key={bs.id} className="flex justify-between text-xs py-1">
                  <span>{bs.service?.name}</span>
                  <span className="font-bold">LKR {bs.price?.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E2E8F0] pt-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Subtotal:</span>
                <span>LKR {selectedInvoice.subtotal?.toLocaleString()}</span>
              </div>
              {selectedInvoice.discountAmount > 0 && (
                <div className="flex justify-between text-[#15803D]">
                  <span>Discount:</span>
                  <span>-LKR {selectedInvoice.discountAmount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#0F172A] pt-2 border-t border-[#E2E8F0]">
                <span>Total Paid:</span>
                <span>LKR {selectedInvoice.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] hover:bg-[#F8FAFC] text-[#0F172A]"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
