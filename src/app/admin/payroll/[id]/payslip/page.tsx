"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Download, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PayslipPrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [record, setRecord] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/payroll/records/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.record) {
          setRecord(data.record);
          setSalon(data.salon);
        } else {
          setError(data.error || "Payroll record not found");
        }
      })
      .catch(() => setError("Failed to load payslip"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const formatLKR = (val: number) => {
    return `Rs. ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center text-[#0F172A]">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold">{error || "Payslip not found"}</p>
          <Link href="/admin/payroll" className="text-[#6D28D9] text-sm hover:underline block">
            ← Back to Payroll
          </Link>
        </div>
      </div>
    );
  }

  const staff = record.staff;
  const branch = record.branch;
  const totalEarnings = (record.basicSalary || 0) + (record.overtimePay || 0) + (record.commissionAmount || 0) + (record.bonusAmount || 0);
  const totalDeductions = (record.deductionAmount || 0) + (record.advanceRecoveryAmount || 0);

  return (
    <div className="min-h-screen bg-transparent text-[#0F172A]">
      {/* Print Controls (hidden on print) */}
      <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/admin/payroll"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[#6D28D9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Payroll
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-semibold text-[var(--text-secondary)] hover:text-[#6D28D9] hover:border-[#E2E8F0] transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Payslip
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

      {/* Printable Payslip Card */}
      <div className="max-w-3xl mx-auto p-6 print:p-0">
        <div className="p-8 rounded-2xl bg-white border border-[#E2E8F0] print:shadow-none print:border-none print:bg-white print:text-black space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#E2E8F0] print:border-gray-300 pb-6">
            <div>
              {salon?.logo && (
                <img
                  src={salon.logo}
                  alt={salon.name}
                  className="w-16 h-16 object-contain rounded-xl mb-3"
                />
              )}
              <h2 className="text-xl font-black text-[#0F172A] print:text-black">{salon?.name || "Salon Business"}</h2>
              {branch && <p className="text-xs text-[var(--text-muted)] print:text-gray-600">{branch.name}</p>}
              {salon?.phone && <p className="text-xs text-[var(--text-muted)] print:text-gray-600">{salon.phone}</p>}
              {salon?.email && <p className="text-xs text-[var(--text-muted)] print:text-gray-600">{salon.email}</p>}
              {salon?.address && <p className="text-xs text-[var(--text-muted)] print:text-gray-600">{salon.address}</p>}
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#8B5CF6]/20 text-[#6D28D9] print:bg-gray-100 print:text-gray-800">
                Official Payslip
              </span>
              <p className="text-lg font-bold text-[#0F172A] print:text-black mt-2">
                {monthNames[(record.periodMonth || 1) - 1]} {record.periodYear || new Date().getFullYear()}
              </p>
              <p className="text-xs text-[var(--text-muted)] print:text-gray-600 font-mono mt-1">
                Ref: {record.id.slice(0, 12)}
              </p>
            </div>
          </div>

          {/* Employee & Pay Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F8FAFC] print:bg-gray-50 border border-[#E2E8F0] print:border-gray-200 text-xs">
            <div>
              <span className="text-[var(--text-muted)] print:text-gray-500 block mb-0.5">Employee Name</span>
              <span className="font-bold text-[#0F172A] print:text-black">{staff?.name || record.staffName}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] print:text-gray-500 block mb-0.5">Email</span>
              <span className="font-mono text-[#0F172A] print:text-black">{staff?.email || "—"}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] print:text-gray-500 block mb-0.5">Payment Method</span>
              <span className="font-semibold text-[#0F172A] print:text-black">{record.paymentMethod || "Bank Transfer"}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] print:text-gray-500 block mb-0.5">Status</span>
              <span className="font-bold text-[#15803D] print:text-green-700 uppercase">{record.status}</span>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Earnings Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] print:text-gray-700 border-b border-[#E2E8F0] print:border-gray-300 pb-2">
                Earnings
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#0F172A] print:text-black">Basic Salary</span>
                  <span className="font-mono font-semibold text-[#0F172A] print:text-black">{formatLKR(record.basicSalary)}</span>
                </div>
                {record.overtimePay > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#0F172A] print:text-black">Overtime Pay ({record.overtimeHours || 0} hrs)</span>
                    <span className="font-mono font-semibold text-[#0F172A] print:text-black">{formatLKR(record.overtimePay)}</span>
                  </div>
                )}
                {record.commissionAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#6D28D9] print:text-purple-700 font-semibold">Staff Commissions</span>
                    <span className="font-mono font-bold text-[#6D28D9] print:text-purple-700">{formatLKR(record.commissionAmount)}</span>
                  </div>
                )}
                {record.bonusAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#15803D] print:text-green-700">Bonus / Allowances</span>
                    <span className="font-mono font-semibold text-[#15803D] print:text-green-700">{formatLKR(record.bonusAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#E2E8F0] print:border-gray-300 font-bold">
                  <span className="text-[#0F172A] print:text-black">Total Earnings:</span>
                  <span className="font-mono text-[#15803D] print:text-green-700">{formatLKR(totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-muted)] print:text-gray-700 border-b border-[#E2E8F0] print:border-gray-300 pb-2">
                Deductions
              </h3>
              <div className="space-y-2 text-xs">
                {record.advanceRecoveryAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#D97706] print:text-amber-700">Salary Advance Recovery</span>
                    <span className="font-mono font-semibold text-[#D97706] print:text-amber-700">-{formatLKR(record.advanceRecoveryAmount)}</span>
                  </div>
                )}
                {record.deductionAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-[#B91C1C] print:text-red-700">Tax / Unpaid Leave Deductions</span>
                    <span className="font-mono font-semibold text-[#B91C1C] print:text-red-700">-{formatLKR(record.deductionAmount)}</span>
                  </div>
                )}
                {totalDeductions === 0 && (
                  <div className="text-[var(--text-muted)] print:text-gray-500 py-1">
                    No deductions for this period.
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#E2E8F0] print:border-gray-300 font-bold">
                  <span className="text-[#0F172A] print:text-black">Total Deductions:</span>
                  <span className="font-mono text-[#B91C1C] print:text-red-700">-{formatLKR(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#8B5CF6]/20 to-[#EC4899]/20 border border-[#8B5CF6]/30 print:bg-gray-100 print:border-gray-400 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] print:text-gray-700 block">
                Net Salary Payable
              </span>
              <span className="text-xs text-[var(--text-muted)] print:text-gray-600">
                Amount credited to employee account
              </span>
            </div>
            <div className="text-2xl font-black text-[#0F172A] print:text-black font-mono">
              {formatLKR(record.netSalary)}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-xs border-t border-[#E2E8F0] print:border-gray-300">
            <div className="space-y-4">
              <div className="border-b border-dashed border-[#E2E8F0] print:border-gray-400 h-8" />
              <p className="text-[var(--text-muted)] print:text-gray-600 text-center">
                Employee Signature & Date
              </p>
            </div>
            <div className="space-y-4">
              <div className="border-b border-dashed border-[#E2E8F0] print:border-gray-400 h-8" />
              <p className="text-[var(--text-muted)] print:text-gray-600 text-center">
                Authorized Salon Signatory
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
