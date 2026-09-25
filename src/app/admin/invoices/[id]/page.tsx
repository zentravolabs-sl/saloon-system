"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Download, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function InvoicePrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.invoice) setInvoice(data.invoice);
        else setError(data.error || "Invoice not found");
      })
      .catch(() => setError("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#0A0B14] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Invoice not found</p>
          <Link href="/admin/invoices" className="text-[#A78BFA] text-sm hover:underline">← Back to Invoices</Link>
        </div>
      </div>
    );
  }

  const { booking } = invoice;
  const salon = booking?.salon;
  const branch = booking?.branch;
  const customer = booking?.customer;
  const staff = booking?.staff;

  return (
    <div className="min-h-screen bg-[#0A0B14] text-white">
      {/* Print controls - hidden during print */}
      <div className="print:hidden sticky top-0 z-10 bg-[#0C0E1A]/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/admin/invoices"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[var(--text-secondary)] hover:text-white hover:border-white/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-sm font-bold shadow-lg shadow-[#8B5CF6]/20"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <div className="card p-8 print:shadow-none print:border-none print:bg-white print:text-black space-y-8">
          {/* Invoice Header */}
          <div className="flex items-start justify-between">
            <div>
              {salon?.logo && (
                <img src={salon.logo} alt={salon.name} className="w-16 h-16 object-contain rounded-xl mb-3" />
              )}
              <h2 className="text-xl font-black text-white print:text-black">{salon?.name}</h2>
              {branch && <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{branch.name}</p>}
              {salon?.phone && <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{salon.phone}</p>}
              {salon?.email && <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{salon.email}</p>}
              {salon?.address && <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{salon.address}</p>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white print:text-black">INVOICE</div>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-[var(--text-muted)] print:text-gray-600">Invoice #</p>
                <p className="text-base font-bold text-white print:text-black font-mono">{invoice.invoiceNumber}</p>
                <p className="text-xs text-[var(--text-muted)] print:text-gray-600 mt-2">Booking Ref</p>
                <p className="text-xs font-semibold text-white print:text-black font-mono">{booking?.reference}</p>
                <p className="text-xs text-[var(--text-muted)] print:text-gray-600 mt-2">Date Issued</p>
                <p className="text-xs font-semibold text-white print:text-black">
                  {new Date(invoice.issuedAt).toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Booking Details */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-white/5 print:bg-gray-50 border border-white/5 print:border-gray-200">
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider mb-2">Billed To</p>
              <p className="text-sm font-bold text-white print:text-black">{customer?.name}</p>
              <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{customer?.phone}</p>
              {customer?.email && <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{customer.email}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider mb-2">Appointment Details</p>
              <p className="text-sm text-[var(--text-muted)] print:text-gray-600">
                {new Date(booking?.bookingDate).toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-sm text-[var(--text-muted)] print:text-gray-600">{booking?.startTime} – {booking?.endTime}</p>
              <p className="text-sm text-[var(--text-muted)] print:text-gray-600">Staff: {staff?.name}</p>
            </div>
          </div>

          {/* Services Table */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 print:border-gray-200">
                  <th className="text-left py-3 text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-center py-3 text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="text-right py-3 text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-100">
                {booking?.services?.map((bs: any) => (
                  <tr key={bs.id}>
                    <td className="py-3 font-medium text-white print:text-black">{bs.service?.name}</td>
                    <td className="py-3 text-[var(--text-muted)] print:text-gray-600">{bs.service?.category?.name}</td>
                    <td className="py-3 text-center text-[var(--text-muted)] print:text-gray-600">{bs.duration} min</td>
                    <td className="py-3 text-right font-semibold text-white print:text-black">LKR {bs.price?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)] print:text-gray-600">Subtotal</span>
              <span className="text-white print:text-black">LKR {invoice.subtotal?.toLocaleString()}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Discount</span>
                <span className="text-green-400">- LKR {invoice.discountAmount?.toLocaleString()}</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)] print:text-gray-600">Tax</span>
                <span className="text-white print:text-black">LKR {invoice.taxAmount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-white/10 print:border-gray-200 pt-3">
              <span className="text-white print:text-black">Total</span>
              <span className="text-white print:text-black">LKR {invoice.totalAmount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-400">Paid</span>
              <span className="text-green-400">LKR {invoice.paidAmount?.toLocaleString()}</span>
            </div>
            {invoice.balanceAmount > 0 && (
              <div className="flex justify-between text-sm font-bold">
                <span className="text-orange-400">Balance Due</span>
                <span className="text-orange-400">LKR {invoice.balanceAmount?.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Payment History */}
          {booking?.payments?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] print:text-gray-500 uppercase tracking-wider mb-3">Payment History</p>
              <div className="space-y-2">
                {booking.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-3 rounded-xl bg-white/5 print:bg-gray-50 border border-white/5 print:border-gray-200">
                    <div>
                      <span className="font-medium text-white print:text-black">{p.method}</span>
                      <span className="text-[var(--text-muted)] print:text-gray-600 ml-2 text-xs">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-semibold text-green-400">LKR {p.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-white/10 print:border-gray-200 pt-6">
            <p className="text-sm text-[var(--text-muted)] print:text-gray-500">Thank you for choosing {salon?.name}!</p>
            {salon?.website && (
              <p className="text-xs text-[#A78BFA] print:text-purple-600 mt-1">{salon.website}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
