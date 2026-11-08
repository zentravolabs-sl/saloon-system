import Link from "next/link";
import { Scissors, ArrowUpRight } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/80 bg-white/70 backdrop-blur-md text-[#475569]">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#A855F7] via-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(124,58,237,0.32)]">
                <Scissors className="w-5 h-5 transform -rotate-90" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-xl font-extrabold text-[#0F172A] tracking-tight">Zentravo</span>
            </Link>
            <p className="text-xs text-[#475569] leading-relaxed">
              Enterprise multi-tenant salon booking &amp; resource management SaaS platform. Built for zero double-bookings.
            </p>
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 text-xs text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#0F172A] mb-4">
              Explore Platform
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/" className="hover:text-[#6D28D9] transition-colors">
                  Platform Overview
                </Link>
              </li>
              <li>
                <Link href="/salons" className="hover:text-[#6D28D9] transition-colors">
                  Browse Salons &amp; Studios
                </Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-[#6D28D9] transition-colors">
                  Book an Appointment
                </Link>
              </li>
              <li>
                <Link href="/booking/lookup" className="hover:text-[#6D28D9] transition-colors">
                  Look Up Appointment Status
                </Link>
              </li>
              <li>
                <Link href="/customer/login" className="hover:text-[#6D28D9] transition-colors">
                  Customer Portal (Mobile OTP)
                </Link>
              </li>
            </ul>
          </div>

          {/* Salon Operations */}
          <div>
            <h4 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#0F172A] mb-4">
              For Salon Owners
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/auth/register" className="hover:text-[#6D28D9] transition-colors">
                  Register Your Salon
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#6D28D9] transition-colors">
                  Salon Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#6D28D9] transition-colors">
                  Stylist &amp; Staff Login
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#6D28D9] transition-colors">
                  Super Admin Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Demo Credentials Card */}
          <div>
            <h4 className="font-heading text-xs font-extrabold uppercase tracking-wider text-[#0F172A] mb-4">
              Demo Credentials
            </h4>
            <div className="text-xs space-y-3 bg-white/95 p-4 rounded-2xl border border-[#E2E8F0] shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6D28D9] block mb-0.5">
                  Super Admin
                </span>
                <p className="font-mono text-[11px] font-semibold text-[#0F172A] select-all">admin@zentravo.com</p>
                <p className="font-mono text-[11px] text-[#64748B]">Admin@123</p>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DB2777] block mb-0.5">
                  Glamour Cuts (Multi-Branch)
                </span>
                <p className="font-mono text-[11px] font-semibold text-[#0F172A] select-all">rajesh@glamourcuts.lk</p>
                <p className="font-mono text-[11px] text-[#64748B]">Admin@123</p>
              </div>

              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="w-full py-1.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#6D28D9] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Quick Login</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[#64748B]">
          <p>© {new Date().getFullYear()} Zentravo SaaS Platform. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <span>PostgreSQL Advisory Locks</span>
            <span>Real-Time Availability</span>
            <span>Multi-Tenant Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
